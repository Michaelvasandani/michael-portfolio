const EXIT_DURATION_MS = 120;

export function createPageTransitionController({
  document,
  window,
  schedule = (callback) => window.setTimeout(callback, EXIT_DURATION_MS),
  navigate = (href) => { window.location.href = href; },
}) {
  let isLeaving = false;

  function animateEntry() {
    document.body.classList.remove('page-leaving');
    document.body.classList.add('page-entering');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => document.body.classList.remove('page-entering'));
    });
  }

  function handleClick(event) {
    const anchor = event.target.closest?.('.page-nav a[href]');
    if (
      !anchor ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      anchor.hasAttribute('download') ||
      (anchor.target && anchor.target !== '_self')
    ) return;

    const destination = new URL(anchor.href, window.location.href);
    if (
      destination.origin !== window.location.origin ||
      !['http:', 'https:'].includes(destination.protocol) ||
      destination.href === window.location.href ||
      isLeaving
    ) return;

    event.preventDefault();
    isLeaving = true;
    document.body.classList.add('page-leaving');
    schedule(() => navigate(destination.href));
  }

  function attach() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nativeTransitions = typeof document.startViewTransition === 'function';
    if (reducedMotion || nativeTransitions) return;

    animateEntry();
    document.addEventListener('click', handleClick);
    window.addEventListener?.('pageshow', animateEntry);
  }

  return { attach };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  createPageTransitionController({ document, window }).attach();
}
