import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const STAGES = [
  'Analyzing context...',
  'Classifying input...',
  'Generating next actions...',
];

type NavigatorThinkingProps = {
  active: boolean;
  activeText?: string;
};

/**
 * Mini-stepper that walks through the three stages while the AI call is in
 * flight. Optionally shows a truncated label of which item is being processed
 * so the user knows what's currently in progress.
 */
export const NavigatorThinking = ({ active, activeText }: NavigatorThinkingProps) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!active) {
      setStage(0);
      return;
    }
    const id = window.setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 900);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  const label = activeText
    ? activeText.length > 48
      ? `${activeText.slice(0, 48)}…`
      : activeText
    : null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <AnimatePresence mode="wait">
        <motion.span
          key={stage}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-200"
        >
          {STAGES[stage]}
        </motion.span>
      </AnimatePresence>

      {label && (
        <span
          className="max-w-[200px] truncate text-[11px] text-text-muted"
          title={activeText}
        >
          "{label}"
        </span>
      )}
    </div>
  );
};
