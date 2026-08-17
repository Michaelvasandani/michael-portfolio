import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { validateDigest } from './digest.ts';
import { validateGeneratedCandidate } from './contracts.ts';
import { initialMaintainerState } from './state.ts';
import type { CandidatePatch, GeneratedContent, MaintainerState, RecentWorkDigest } from './types.ts';

const PROJECTS_PATH = '_data/generated/projects.json';
const DIGEST_PATH = '_data/generated/recent-work.json';
const STATE_PATH = '.portfolio-maintainer/state.json';

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined;
    if (code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function readRepositoryState(root: string): Promise<{ generated: GeneratedContent; state: MaintainerState }> {
  const projects = await readJson<GeneratedContent>(join(root, PROJECTS_PATH), { schemaVersion: 1, generatedAt: null, projects: [] });
  const recentWork = await readJson<RecentWorkDigest>(join(root, DIGEST_PATH), { schemaVersion: 1, updatedAt: null, entries: [] });
  validateDigest(recentWork);
  const state = await readJson<MaintainerState>(join(root, STATE_PATH), initialMaintainerState());
  return { generated: { ...projects, recentWork }, state };
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeTemp(path: string, value: unknown): Promise<string> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporaryPath, json(value), { encoding: 'utf8', mode: 0o644 });
  return temporaryPath;
}

export async function commitCandidate(root: string, candidate: CandidatePatch, current: GeneratedContent): Promise<void> {
  validateGeneratedCandidate(candidate, current);
  const files: Array<[string, unknown]> = [
    [join(root, PROJECTS_PATH), { schemaVersion: 1, generatedAt: candidate.generated.generatedAt, projects: candidate.generated.projects }],
    [join(root, DIGEST_PATH), candidate.generated.recentWork ?? { schemaVersion: 1, updatedAt: null, entries: [] }],
    [join(root, STATE_PATH), candidate.state],
  ];
  const previous = new Map<string, string | null>();
  const temporary = new Map<string, string>();
  for (const [path, value] of files) {
    try { previous.set(path, await readFile(path, 'utf8')); } catch { previous.set(path, null); }
    temporary.set(path, await writeTemp(path, value));
  }
  const replaced: string[] = [];
  try {
    for (const [path] of files) {
      await rename(temporary.get(path)!, path);
      replaced.push(path);
    }
  } catch (error) {
    for (const path of replaced) {
      const old = previous.get(path);
      if (typeof old === 'string') await writeFile(path, old, 'utf8');
      else await rm(path, { force: true });
    }
    throw error;
  } finally {
    for (const path of temporary.values()) await rm(path, { force: true });
  }
}

export function generatedPaths(mode: 'pins' | 'digest'): string[] {
  return mode === 'pins' ? [PROJECTS_PATH, STATE_PATH] : [DIGEST_PATH, STATE_PATH];
}
