import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { pageTransition } from '@/lib/motionPresets';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type AnimatedPageProps = {
  children: ReactNode;
  className?: string;
};

export const AnimatedPage = ({ children, className }: AnimatedPageProps) => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={pageTransition}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
};
