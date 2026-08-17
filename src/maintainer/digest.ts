import type { DigestEntry, RecentWorkDigest } from './types.ts';

export type { RecentWorkDigest } from './types.ts';

function isGitHubUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'github.com' || url.hostname === 'www.github.com') && url.pathname.split('/').filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}

function checkEntry(entry: DigestEntry): void {
  if (!entry || typeof entry !== 'object') throw new Error('Recent Work Digest entries must be objects');
  for (const [name, max] of [['id', 120], ['headline', 180], ['summary', 800]] as const) {
    if (typeof entry[name] !== 'string' || entry[name].trim().length === 0 || entry[name].length > max) throw new Error(`Recent Work Digest ${name} is invalid`);
    if (/<\/?(?:script|style|iframe|object|embed)\b|\bon[a-z]+\s*=/i.test(entry[name])) throw new Error('Recent Work Digest contains unsafe text');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || Number.isNaN(Date.parse(`${entry.date}T00:00:00Z`))) throw new Error('Recent Work Digest date is invalid');
  if (!Array.isArray(entry.technologies) || entry.technologies.length > 20 || entry.technologies.some((item) => typeof item !== 'string' || item.length > 80)) throw new Error('Recent Work Digest technologies are invalid');
  if (!isGitHubUrl(entry.evidenceUrl)) throw new Error('Recent Work Digest evidence must be a public GitHub link');
}

export function validateDigest(digest: RecentWorkDigest): { ok: true } {
  if (!digest || digest.schemaVersion !== 1 || !Array.isArray(digest.entries)) throw new Error('Recent Work Digest schema is invalid');
  if (digest.entries.length > 3) throw new Error('Recent Work Digest may contain no more than three entries');
  if (digest.updatedAt !== null && (typeof digest.updatedAt !== 'string' || Number.isNaN(Date.parse(digest.updatedAt)))) throw new Error('Recent Work Digest updatedAt is invalid');
  const ids = new Set<string>();
  for (const entry of digest.entries) {
    checkEntry(entry);
    if (ids.has(entry.id)) throw new Error('Recent Work Digest contains duplicate entry IDs');
    ids.add(entry.id);
  }
  return { ok: true };
}

export function selectDigestEntries(entries: DigestEntry[]): DigestEntry[] {
  const unique = new Map<string, DigestEntry>();
  for (const entry of entries) unique.set(entry.id, entry);
  return [...unique.values()].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 3);
}

/** Candidate A: each successful weekly refresh replaces the visible digest. */
export function replaceDigest(_previous: RecentWorkDigest | null | undefined, entries: DigestEntry[], updatedAt: string): RecentWorkDigest {
  const digest: RecentWorkDigest = { schemaVersion: 1, updatedAt, entries: selectDigestEntries(entries) };
  validateDigest(digest);
  return digest;
}
