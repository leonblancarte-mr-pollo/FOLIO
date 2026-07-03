import { Howl } from 'howler';

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const STREAK_KEYS = new Set(['streak_7', 'streak_30', 'streak_90']);

function makeSound(src, volume = 0.65) {
  let howl = null;

  function load() {
    if (howl) return;
    howl = new Howl({
      src: [src],
      volume,
      html5: true,
      preload: false,
      onloaderror: () => { howl = null; },
    });
  }

  return function play() {
    if (prefersReduced()) return;
    try {
      load();
      howl.play();
    } catch { /* audio not critical */ }
  };
}

export const playBookFinished = makeSound(
  'https://freesound.org/data/previews/450/450271_7896181-lq.mp3',
  0.65
);

export const playAchievementUnlocked = makeSound(
  'https://freesound.org/data/previews/415/415759_8170839-lq.mp3',
  0.55
);

export const playReadingSession = makeSound(
  'https://freesound.org/data/previews/536/536575_7919903-lq.mp3',
  0.5
);

export const playStreakMilestone = makeSound(
  'https://freesound.org/data/previews/522/522958_9641501-lq.mp3',
  0.7
);

/**
 * Called from checkAchievements with the newly unlocked keys.
 * Plays victory for streak milestones, fanfare for everything else.
 */
export function playAchievementSound(newKeys = []) {
  if (!newKeys.length || prefersReduced()) return;
  const hasStreakMilestone = newKeys.some(k => STREAK_KEYS.has(k));
  if (hasStreakMilestone) playStreakMilestone();
  else playAchievementUnlocked();
}
