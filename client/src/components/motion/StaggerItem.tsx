import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { staggerItem } from '@/lib/motionPresets';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type StaggerItemProps = {
  index: number;
  children: ReactNode;
  className?: string;
};

export const StaggerItem = ({ index, children, className }: StaggerItemProps) => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={staggerItem(index, false)}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
};
