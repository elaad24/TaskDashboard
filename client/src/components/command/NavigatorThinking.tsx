import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const STAGES = [
  'Analyzing context...',
  'Classifying input...',
  'Generating next actions...',
];

type NavigatorThinkingProps = {
  active: boolean;
};

/**
 * Mini-stepper that walks through the spec's three stages while the AI call
 * is in flight. We rotate stages every ~900ms; the parent decides when to
 * unmount this by toggling `active` once the response arrives.
 */
export const NavigatorThinking = ({ active }: NavigatorThinkingProps) => {
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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stage}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18 }}
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-200"
      >
        {STAGES[stage]}
      </motion.div>
    </AnimatePresence>
  );
};
