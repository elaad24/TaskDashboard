import confetti from 'canvas-confetti';

export type CelebrateTier = 'create' | 'update' | 'complete' | 'streak' | 'goal';

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const burst = (options: confetti.Options): void => {
  if (prefersReducedMotion()) return;
  void confetti(options);
};

export const celebrate = (tier: CelebrateTier, _message?: string): void => {
  if (prefersReducedMotion()) return;

  switch (tier) {
    case 'create':
      burst({
        particleCount: 24,
        spread: 40,
        origin: { x: 0.92, y: 0.12 },
        colors: ['#00D9FF', '#35FFB6'],
        scalar: 0.7,
      });
      break;
    case 'update':
      burst({
        particleCount: 18,
        spread: 50,
        origin: { y: 0.55 },
        colors: ['#00D9FF'],
        scalar: 0.6,
      });
      break;
    case 'complete':
      burst({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#00D9FF', '#35FFB6', '#FFB020', '#E6F1FF'],
      });
      burst({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#00D9FF', '#35FFB6'],
      });
      burst({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#00D9FF', '#35FFB6'],
      });
      break;
    case 'streak':
      burst({
        particleCount: 140,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#00D9FF', '#35FFB6', '#FFB020'],
      });
      burst({
        particleCount: 60,
        spread: 120,
        startVelocity: 35,
        origin: { x: 0.5, y: 0.4 },
        colors: ['#35FFB6', '#00D9FF'],
      });
      break;
    case 'goal':
      burst({
        particleCount: 160,
        spread: 120,
        origin: { y: 0.45 },
        colors: ['#00D9FF', '#35FFB6', '#FFB020', '#E6F1FF'],
      });
      burst({
        particleCount: 80,
        spread: 140,
        startVelocity: 40,
        origin: { x: 0.5, y: 0.35 },
        colors: ['#35FFB6', '#00D9FF', '#FFB020'],
      });
      break;
    default:
      break;
  }
};

/** @deprecated Use celebrate('complete') instead */
export const celebrateCompletion = (message?: string): void => {
  celebrate('complete', message);
};
