export function smoothScrollToTop() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
}

export function smoothScrollElementIntoView(element: HTMLElement | null) {
  if (!element) return;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  element.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'nearest',
  });
}
