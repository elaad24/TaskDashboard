import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-3 rounded-glass border border-dashed border-border-subtle p-8 text-center',
      className,
    )}
  >
    {icon && <div className="text-cyan/70">{icon}</div>}
    <div className="text-sm font-medium text-text-main">{title}</div>
    {description && <div className="max-w-sm text-xs leading-relaxed text-text-soft">{description}</div>}
    {action}
  </div>
);
