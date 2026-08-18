import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSiteContent } from '../src/maintainer/site.ts';

test('site content contains the Outcome Funnel sections and never exposes the resume phone number', async () => {
  const result = await validateSiteContent({ root: process.cwd() });
  assert.equal(result.ok, true);
  assert.match(result.html, /About me/);
  assert.match(result.html, /Experience/);
  assert.match(result.html, /Projects/);
  assert.match(result.html, /Recent work/);
  assert.doesNotMatch(result.html, /858\D*319\D*8367/);
});

test('site renders Project Profiles from the generated projects array', async () => {
  const result = await validateSiteContent({ root: process.cwd() });

  assert.match(result.html, /{%\s*for project in site\.data\.generated\.projects\.projects\s*%}/);
});

test('hero identifies the portfolio as agentically maintained', async () => {
  const result = await validateSiteContent({ root: process.cwd() });

  assert.match(result.html, /class="agentic-note"[^>]*>{{ site\.data\.profile\.agenticNote }}/);
});
