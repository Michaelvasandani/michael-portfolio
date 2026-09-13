import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const pages = ['index.html', 'experience/index.html', 'projects/index.html', 'thoughts.html'];
const labels = ['About', 'Experience', 'Projects', 'Thoughts'];
for (const base of ['https://example.test/', 'https://example.test/portfolio/', new URL('./', import.meta.url).href]) {
  for (const [pageIndex, page] of pages.entries()) {
    test(`${page}: all navigation destinations resolve from ${base}`, async () => {
      const html = await readFile(new URL(page, import.meta.url), 'utf8');
      const nav = html.match(/<nav class="page-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
      const links = [...nav.matchAll(/<a href="([^"]+)"([^>]*)>([^<]+)<\/a>/g)];
      assert.equal(links.length, 4);
      for (const [i, [, href, attributes, label]] of links.entries()) {
        assert.equal(label, labels[i]);
        assert.equal(new URL(href, new URL(page, base)).href, new URL(pages[i], base).href, `${label} points outside the expected page`);
        assert.equal(attributes.includes('aria-current="page"'), i === pageIndex);
        await access(new URL(pages[i], import.meta.url));
      }
    });
  }
}
