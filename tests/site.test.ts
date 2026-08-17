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
