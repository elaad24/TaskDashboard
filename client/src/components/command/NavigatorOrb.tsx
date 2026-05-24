import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

type NavigatorOrbProps = {
  size?: number;
  state?: 'idle' | 'thinking' | 'speaking';
  className?: string;
};

export const NavigatorOrb = ({ size = 40, state = 'idle', className }: NavigatorOrbProps) => {
  const intensity = state === 'thinking' ? 1.4 : state === 'speaking' ? 1.2 : 1;
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(53,255,182,0.85), rgba(0,217,255,0.55) 55%, rgba(0,217,255,0) 75%)',
        }}
        animate={{
          scale: state === 'thinking' ? [1, 1.08, 1] : [1, 1.04, 1],
          opacity: [0.85, 1, 0.85],
        }}
        transition={{
          duration: state === 'thinking' ? 1.4 : 3.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full border border-border-accent"
        animate={{
          boxShadow: [
            `0 0 ${10 * intensity}px rgba(0,217,255,0.35)`,
            `0 0 ${28 * intensity}px rgba(0,217,255,0.55)`,
            `0 0 ${10 * intensity}px rgba(0,217,255,0.35)`,
          ],
        }}
        transition={{ duration: state === 'thinking' ? 1.4 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="sr-only">Navigator</span>
    </div>
  );
};
