import type { ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/cn';

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export const PageHeader = ({ title, description, action }: PageHeaderProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1
          className={cn(
            'text-xl font-semibold tracking-tight',
            reduceMotion
              ? 'text-text-main'
              : 'bg-primary bg-clip-text text-transparent',
          )}
        >
          {title}
        </h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-text-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
};
