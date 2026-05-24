import { GraduationCap, ListChecks, Map, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import {
  setLastWorkView,
  workViewToPath,
  type WorkView,
  getWorkViewFromPath,
} from '@/lib/workView';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { transitionFast } from '@/lib/motionPresets';

const SEGMENTS: Array<{ view: WorkView; label: string; icon: typeof ListChecks }> = [
  { view: 'tasks', label: 'Tasks', icon: ListChecks },
  { view: 'goals', label: 'Goals', icon: Target },
  { view: 'study', label: 'Study', icon: GraduationCap },
  { view: 'mission-map', label: 'Mission Map', icon: Map },
];

export const WorkSwitcher = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const activeView = getWorkViewFromPath(location.pathname) ?? 'tasks';

  const handleSelect = (view: WorkView) => {
    if (view === activeView) return;
    setLastWorkView(view);
    navigate(workViewToPath[view]);
  };

  return (
    <div
      className="relative mb-4 inline-flex rounded-lg border border-border-subtle bg-bg-deep/60 p-1"
      role="tablist"
      aria-label="Work views"
    >
      {SEGMENTS.map(({ view, label, icon: Icon }) => {
        const selected = activeView === view;
        return (
          <button
            key={view}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => handleSelect(view)}
            className={cn(
              'relative z-10 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
              selected ? 'text-text-main' : 'text-text-soft hover:text-text-main',
            )}
            data-test-id={`work-switcher-${view}`}
          >
            {selected && !reduceMotion && (
              <motion.div
                layoutId="work-switcher-pill"
                className="absolute inset-0 rounded-md bg-cyan/15 shadow-[0_0_12px_rgba(0,217,255,0.12)]"
                transition={transitionFast}
              />
            )}
            {selected && reduceMotion && (
              <span className="absolute inset-0 rounded-md bg-cyan/15 shadow-[0_0_12px_rgba(0,217,255,0.12)]" />
            )}
            <Icon
              size={14}
              className={cn('relative', selected ? 'text-cyan' : 'text-text-soft')}
            />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
};
