import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'cyan' | 'neon' | 'amber' | 'danger';

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  glow?: boolean;
  interactive?: boolean;
  asChild?: boolean;
  children: ReactNode;
};

const variantBorder: Record<Variant, string> = {
  default: 'border-border-subtle',
  cyan: 'border-border-card',
  neon: 'border-border-pill-neon',
  amber: 'border-border-pill-amber',
  danger: 'border-border-pill-danger',
};

const variantGlow: Record<Variant, string> = {
  default: 'shadow-glass',
  cyan: 'shadow-glow-cyan',
  neon: 'shadow-glow-neon',
  amber: 'shadow-glow-amber',
  danger: 'shadow-glow-danger',
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = 'default', glow = false, interactive = false, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-glass border bg-card-glass backdrop-blur-glass',
        'transition-shadow',
        variantBorder[variant],
        glow ? variantGlow[variant] : 'shadow-glass',
        interactive &&
          'glass-card-shine transition-all duration-200 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r hover:-translate-y-0.5 hover:border-border-accent hover:shadow-glow-cyan motion-reduce:transform-none motion-reduce:hover:translate-y-0',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  ),
);
GlassCard.displayName = 'GlassCard';
