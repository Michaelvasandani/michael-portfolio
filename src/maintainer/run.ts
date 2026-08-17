import { readRepositoryState, commitCandidate, generatedPaths } from './persistence.ts';
import { GitHubClient } from './github.ts';
import { generateDigest, generateProjectProfile } from './generator.ts';
import { validateGeneratedCandidate } from './contracts.ts';
import { mergeAppendOnlyProjects } from './contracts.ts';
import { reconcilePinState } from './state.ts';
import { selectDigestEntries } from './digest.ts';
import { withRetries } from './retry.ts';
import { validateSiteContent } from './site.ts';
import { initialMaintainerState } from './state.ts';
import type { CandidatePatch, EvidenceBundle, GeneratedContent, GitHubEvent, MaintainerState, PinSnapshot, RecentWorkDigest } from './types.ts';

export type MaintainerMode = 'pins' | 'digest';

export interface MaintainerRunOptions {
  root: string;
  mode: MaintainerMode;
  login: string;
  githubToken?: string;
  openAiApiKey?: string;
  openAiModel?: string;
  now?: string;
  fetchImpl?: typeof fetch;
  dryRun?: boolean;
}

export interface MaintainerRunResult {
  mode: MaintainerMode;
  changed: boolean;
  newProjects: number;
  digestEntries: number;
  checkpoint: string | null;
}

function noDuplicate<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function stateWithDefaults(state: MaintainerState): MaintainerState {
  return { ...initialMaintainerState(), ...state };
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function candidateRevision(now: string): string {
  return process.env.GITHUB_SHA ?? `local-${now.replace(/[^0-9]/g, '').slice(0, 17)}`;
}

function actorEvents(events: GitHubEvent[], login: string): GitHubEvent[] {
  const meaningfulTypes = new Set(['PushEvent', 'PullRequestEvent', 'ReleaseEvent', 'PullRequestReviewEvent', 'IssuesEvent', 'IssueCommentEvent']);
  return events.filter((event) => meaningfulTypes.has(event.type) && event.actor?.login?.toLowerCase() === login.toLowerCase() && typeof event.repo?.name === 'string');
}

async function gatherEvidence(client: GitHubClient, events: GitHubEvent[], login: string, since?: string): Promise<EvidenceBundle[]> {
  const candidates = noDuplicate(actorEvents(events, login), (event) => event.repo!.name!);
  const evidence: EvidenceBundle[] = [];
  for (const event of candidates) {
    try {
      evidence.push(await withRetries(() => client.collectEvidence(event.repo!.name!, login, events, since), { maxAttempts: 3 }));
    } catch (error) {
      // A single malformed/private repository must not become a claim; fail closed for that candidate and continue public work.
      if ((error as { status?: number }).status === 422 || (error as { status?: number }).status === 404) continue;
      throw error;
    }
  }
  return noDuplicate(evidence, (item) => item.repository.id);
}

function cursorFor(events: GitHubEvent[], previous: string | null): string | null {
  return events[0]?.id ?? previous;
}

export async function runPortfolioMaintainer(options: MaintainerRunOptions): Promise<MaintainerRunResult> {
  const now = options.now ?? new Date().toISOString();
  const repository = await readRepositoryState(options.root);
  const currentGenerated = repository.generated;
  const currentState = stateWithDefaults(repository.state);
  const client = new GitHubClient({ token: options.githubToken ?? process.env.GITHUB_TOKEN, fetchImpl: options.fetchImpl });
  const nextState: MaintainerState = { ...currentState };
  let nextGenerated: GeneratedContent = { ...currentGenerated };
  let newProjects = 0;
  let digestEntries = currentGenerated.recentWork?.entries.length ?? 0;

  if (options.mode === 'pins') {
    const currentPins = await withRetries(() => client.getPinnedProjects(options.login), { maxAttempts: 3 });
    const previousPinIds = new Set(currentState.pinSnapshot);
    const newPins = currentPins.filter((pin) => !previousPinIds.has(pin.repositoryId) && !currentState.representedRepositoryIds.includes(pin.repositoryId));
    if (newPins.length > 0) {
      const events = await withRetries(() => client.listPublicEvents(options.login), { maxAttempts: 3 });
      const profiles = [];
      for (const pin of newPins) {
        const evidence = await withRetries(() => client.collectEvidence(pin.repository, options.login, events), { maxAttempts: 3 });
        profiles.push(await withRetries(() => generateProjectProfile(evidence, { apiKey: options.openAiApiKey ?? process.env.OPENAI_API_KEY ?? '', model: options.openAiModel, fetchImpl: options.fetchImpl }, now, pin.repositoryId), { maxAttempts: 2 }));
      }
      nextGenerated = { ...currentGenerated, generatedAt: now, projects: mergeAppendOnlyProjects(currentGenerated.projects, profiles) };
      newProjects = profiles.length;
    }
    Object.assign(nextState, reconcilePinState(currentState, currentPins, now));
  } else {
    const events = await withRetries(() => client.listPublicEvents(options.login), { maxAttempts: 3 });
    const evidence = await gatherEvidence(client, events, options.login, currentState.lastDigestRefreshAt ?? undefined);
    const digest: RecentWorkDigest = evidence.length > 0
      ? await withRetries(() => generateDigest(evidence, { apiKey: options.openAiApiKey ?? process.env.OPENAI_API_KEY ?? '', model: options.openAiModel, fetchImpl: options.fetchImpl }, now), { maxAttempts: 2 })
      : { schemaVersion: 1, updatedAt: now, entries: [] };
    digest.entries = selectDigestEntries(digest.entries);
    nextGenerated = { ...currentGenerated, generatedAt: currentGenerated.generatedAt ?? now, recentWork: digest };
    nextState.lastDigestRefreshAt = now;
    nextState.activityCursor = cursorFor(events, currentState.activityCursor);
    digestEntries = digest.entries.length;
  }

  const revision = candidateRevision(now);
  nextState.checkpoint = { revision, committedAt: now };
  const candidate: CandidatePatch = { paths: generatedPaths(options.mode), generated: nextGenerated, state: nextState };
  validateGeneratedCandidate(candidate, currentGenerated);
  await validateSiteContent({ root: options.root });
  const changed = !same(currentGenerated, nextGenerated) || !same(currentState, nextState);
  if (changed && !options.dryRun) await commitCandidate(options.root, candidate, currentGenerated);
  return { mode: options.mode, changed, newProjects, digestEntries, checkpoint: changed ? revision : currentState.checkpoint?.revision ?? null };
}
