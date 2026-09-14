import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const transitions = await import('./assets/page-transitions.mjs').catch(() => ({}));

test('unsupported browsers fade out before same-origin page navigation', () => {
  assert.equal(typeof transitions.createPageTransitionController, 'function');

  const classes = new Set();
  const listeners = {};
  let scheduled;
  let destination;
  const document = {
    body: {
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
      },
    },
    addEventListener: (name, listener) => { listeners[name] = listener; },
    startViewTransition: undefined,
  };
  const window = {
    location: { href: 'https://example.test/index.html', origin: 'https://example.test' },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (callback) => callback(),
  };

  const controller = transitions.createPageTransitionController({
    document,
    window,
    schedule: (callback) => { scheduled = callback; },
    navigate: (href) => { destination = href; },
  });
  controller.attach();

  const anchor = {
    href: 'https://example.test/experience/index.html',
    origin: 'https://example.test',
    protocol: 'https:',
    target: '',
    hasAttribute: () => false,
    closest: () => anchor,
  };
  const event = {
    button: 0,
    defaultPrevented: false,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    target: anchor,
    preventDefault() { this.defaultPrevented = true; },
  };

  listeners.click(event);

  assert.equal(event.defaultPrevented, true);
  assert.equal(classes.has('page-leaving'), true);
  assert.equal(destination, undefined);
  scheduled();
  assert.equal(destination, anchor.href);
});

test('native View Transitions remain in control when supported', () => {
  assert.equal(typeof transitions.createPageTransitionController, 'function');

  const listeners = {};
  const document = {
    body: { classList: { add() {}, remove() {} } },
    addEventListener: (name, listener) => { listeners[name] = listener; },
    startViewTransition() {},
  };
  const window = {
    location: { href: 'https://example.test/index.html', origin: 'https://example.test' },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (callback) => callback(),
  };

  const controller = transitions.createPageTransitionController({ document, window });
  controller.attach();

  assert.equal(listeners.click, undefined);
});

test('every page loads the transition fallback and defines its animation states', async () => {
  const pages = new Map([
    ['index.html', 'assets/page-transitions.mjs'],
    ['experience/index.html', '../assets/page-transitions.mjs'],
    ['projects/index.html', '../assets/page-transitions.mjs'],
    ['thoughts.html', 'assets/page-transitions.mjs'],
  ]);

  for (const [page, source] of pages) {
    const html = await readFile(new URL(page, import.meta.url), 'utf8');
    assert.match(html, new RegExp(`<script type="module" src="${source.replace('.', '\\.')}"></script>`));
  }

  const css = await readFile(new URL('./assets/site.css', import.meta.url), 'utf8');
  assert.match(css, /body\.page-entering main/);
  assert.match(css, /body\.page-leaving main/);
});
