import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useStreak } from '@/hooks/useStreak';
import { cn } from '@/lib/cn';

export const XpBadge = () => {
  const streak = useStreak();
  const total = streak.data?.totalCompletions ?? 0;
  const spring = useSpring(total, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [shown, setShown] = useState(0);
  const prevTotal = useRef(total);

  useEffect(() => {
    spring.set(total);
  }, [total, spring]);

  useEffect(() => {
    const unsub = display.on('change', (v) => setShown(v));
    return () => unsub();
  }, [display]);

  useEffect(() => {
    if (total > prevTotal.current) {
      prevTotal.current = total;
    }
  }, [total]);

  return (
    <div
      className={cn(
        'mx-3 mb-2 flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-mid/40 px-3 py-2',
      )}
      data-test-id="xp-badge"
      title="Total task completions"
    >
      <Zap size={14} className="shrink-0 text-cyan" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-text-muted">Mission XP</div>
        <motion.div className="font-mono text-sm font-semibold text-text-main">{shown}</motion.div>
      </div>
    </div>
  );
};
