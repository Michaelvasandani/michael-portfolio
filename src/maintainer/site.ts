import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface SiteValidationResult {
  ok: true;
  html: string;
  checkedFiles: string[];
}

const REQUIRED_SECTIONS = ['About me', 'Experience', 'Projects', 'Recent work', 'Hobbies'];

export async function validateSiteContent(options: { root: string }): Promise<SiteValidationResult> {
  const indexPath = join(options.root, 'index.html');
  const html = await readFile(indexPath, 'utf8');
  const phonePattern = /858\D*319\D*8367/;
  const missing = REQUIRED_SECTIONS.filter((section) => !html.includes(section));
  if (missing.length > 0) throw new Error(`Portfolio is missing required sections: ${missing.join(', ')}`);
  if (phonePattern.test(html)) throw new Error('Protected phone number must not appear in public site HTML');
  if (/<script\b[^>]*>|\s+on[a-z]+\s*=/i.test(html)) throw new Error('Portfolio HTML contains an unsafe executable payload');
  const projectData = JSON.parse(await readFile(join(options.root, '_data/generated/projects.json'), 'utf8')) as { schemaVersion?: number; projects?: unknown[] };
  const digestData = JSON.parse(await readFile(join(options.root, '_data/generated/recent-work.json'), 'utf8')) as { schemaVersion?: number; entries?: unknown[] };
  if (projectData.schemaVersion !== 1 || !Array.isArray(projectData.projects)) throw new Error('Generated Project Profiles JSON is invalid');
  if (digestData.schemaVersion !== 1 || !Array.isArray(digestData.entries) || digestData.entries.length > 3) throw new Error('Generated Recent Work Digest JSON is invalid');
  return { ok: true, html, checkedFiles: [indexPath, join(options.root, '_data/generated/projects.json'), join(options.root, '_data/generated/recent-work.json')] };
}
