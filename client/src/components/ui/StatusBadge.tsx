import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'cyan' | 'neon' | 'amber' | 'danger' | 'muted';

type StatusBadgeProps = {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
};

const toneClasses: Record<Tone, string> = {
  cyan: 'bg-cyan/10 text-cyan-200 border-border-pill',
  neon: 'bg-neon/10 text-neon border-border-pill-neon',
  amber: 'bg-amber/10 text-amber-400 border-border-pill-amber',
  danger: 'bg-danger/10 text-danger-400 border-border-pill-danger',
  muted: 'bg-white/5 text-text-soft border-border-subtle',
};

const dotClasses: Record<Tone, string> = {
  cyan: 'bg-cyan',
  neon: 'bg-neon',
  amber: 'bg-amber',
  danger: 'bg-danger',
  muted: 'bg-text-muted',
};

export const StatusBadge = ({ tone = 'muted', children, dot = false, className }: StatusBadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
      toneClasses[tone],
      className,
    )}
  >
    {dot && <span className={cn('h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]', dotClasses[tone])} />}
    {children}
  </span>
);
