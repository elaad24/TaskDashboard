import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
};

export const SectionHeader = ({ title, subtitle, action, className, icon }: SectionHeaderProps) => (
  <div className={cn('flex items-start justify-between gap-3', className)}>
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5 text-cyan">{icon}</div>}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-main">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-text-soft">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);
