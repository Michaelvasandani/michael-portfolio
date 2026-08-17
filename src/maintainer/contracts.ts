import type { CandidatePatch, CandidateValidation, GeneratedContent, GeneratedProject } from './types.ts';
import { validateDigest } from './digest.ts';

export type { CandidatePatch, GeneratedContent, GeneratedProject } from './types.ts';

const ALLOWED_PATHS = new Set([
  '_data/generated/projects.json',
  '_data/generated/recent-work.json',
  '.portfolio-maintainer/state.json',
]);

function isGitHubUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'github.com' || url.hostname === 'www.github.com') && url.pathname.split('/').filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

function isSafeText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength && !/<\/?(?:script|style|iframe|object|embed)\b|\bon[a-z]+\s*=/i.test(value);
}

function validateProject(project: GeneratedProject): void {
  if (!project || typeof project !== 'object') throw new Error('Project Profile must be an object');
  if (!isSafeText(project.repositoryId, 180)) throw new Error('Project Profile repositoryId is required');
  if (!isSafeText(project.repository, 180)) throw new Error('Project Profile repository is required');
  if (!isGitHubUrl(project.url)) throw new Error('Project Profile URL must be a public GitHub link');
  if (!isSafeText(project.purpose, 600) || !isSafeText(project.contribution, 800)) throw new Error('Project Profile purpose and contribution require bounded evidence-backed text');
  if (!Array.isArray(project.technologies) || project.technologies.length > 20 || project.technologies.some((item) => !isSafeText(item, 80))) throw new Error('Project Profile technologies are invalid');
  if (!isGitHubUrl(project.evidenceUrl)) throw new Error('Project Profile evidence must be a public GitHub link');
  if (!isSafeText(project.createdAt, 80) || Number.isNaN(Date.parse(project.createdAt))) throw new Error('Project Profile createdAt must be an ISO timestamp');
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function mergeAppendOnlyProjects(existing: GeneratedProject[], additions: GeneratedProject[]): GeneratedProject[] {
  const merged = [...existing];
  const known = new Set(existing.map((project) => project.repositoryId));
  for (const project of additions) {
    validateProject(project);
    if (!known.has(project.repositoryId)) {
      merged.push(project);
      known.add(project.repositoryId);
    }
  }
  return merged;
}

export function validateGeneratedCandidate(candidate: CandidatePatch, current: GeneratedContent): CandidateValidation {
  if (!candidate || !candidate.generated || !candidate.state) throw new Error('Candidate must include generated content and state');
  if (candidate.paths.length === 0 || candidate.paths.some((path) => !ALLOWED_PATHS.has(path))) throw new Error('Candidate writes outside the generated-content allowlist');
  if (candidate.generated.schemaVersion !== 1 || !Array.isArray(candidate.generated.projects)) throw new Error('Generated Project Profiles schema is invalid');
  const ids = new Set<string>();
  for (const project of candidate.generated.projects) {
    validateProject(project);
    if (ids.has(project.repositoryId)) throw new Error('Generated Project Profiles contain duplicate repository IDs');
    ids.add(project.repositoryId);
  }
  const currentById = new Map(current.projects.map((project) => [project.repositoryId, project]));
  for (const [id, existing] of currentById) {
    const next = candidate.generated.projects.find((project) => project.repositoryId === id);
    if (!next || !sameJson(existing, next)) throw new Error('Generated Project Profiles are append-only; existing profiles cannot be removed or rewritten');
  }
  if (candidate.generated.recentWork) validateDigest(candidate.generated.recentWork);
  const stateIds = new Set(candidate.state.representedRepositoryIds);
  for (const id of ids) if (!stateIds.has(id)) throw new Error('Maintainer state must retain every represented Project Profile ID');
  if (new Set(candidate.state.pinSnapshot).size !== candidate.state.pinSnapshot.length) throw new Error('Pin snapshot contains duplicate repository IDs');
  if (new Set(candidate.state.representedRepositoryIds).size !== candidate.state.representedRepositoryIds.length) throw new Error('Represented repository IDs contain duplicates');
  return { ok: true, changedPaths: [...candidate.paths] };
}

export function allowedGeneratedPaths(): string[] {
  return [...ALLOWED_PATHS];
}
