import { cn } from '@/lib/cn';

export const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'animate-pulse rounded-md bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04] bg-[length:400px_100%]',
      className,
    )}
    aria-hidden
  />
);
