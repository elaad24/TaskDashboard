import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const KBD = ({ children, className }: { children: ReactNode; className?: string }) => (
  <kbd
    className={cn(
      'inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border-subtle bg-white/5 px-1.5 font-mono text-[10px] text-text-soft',
      className,
    )}
  >
    {children}
  </kbd>
);
