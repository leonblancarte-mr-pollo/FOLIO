export const HAPTIC = {
  NAV: 10,
  LIKE: 15,
  DOUBLE_LIKE: [15, 30, 15],
  BOOK_DONE: [30, 50, 30, 50, 100],
  ACHIEVEMENT: [20, 50, 20, 50, 20, 50, 100],
  STREAK_MILESTONE: [50, 100, 50, 100, 200],
  ERROR: [100, 50, 100],
};

export function haptic(pattern) {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try { navigator.vibrate?.(pattern); } catch {}
}
