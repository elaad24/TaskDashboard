import type { Transition, Variants } from 'framer-motion';

export const transitionFast: Transition = { duration: 0.2, ease: 'easeOut' };
export const transitionBase: Transition = { duration: 0.28, ease: 'easeOut' };

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
};

export const fadeUpStagger: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
};

export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
};

export const staggerItem = (index: number, reduceMotion: boolean): Variants => {
  if (reduceMotion) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
    };
  }
  return {
    initial: { opacity: 0, y: 8 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.28,
        ease: 'easeOut',
        delay: index * 0.06,
      },
    },
  };
};
