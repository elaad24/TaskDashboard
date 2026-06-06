import { Layers, Zap } from 'lucide-react';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatusBadge } from '@/components/ui/StatusBadge';

type TaskComplexityToggleProps = {
  isSimpleTask: boolean;
  isPending: boolean;
  disabled?: boolean;
  onMakeSimple: () => void;
  onMakeComplex: () => void;
};

export const TaskComplexityToggle = ({
  isSimpleTask,
  isPending,
  disabled = false,
  onMakeSimple,
  onMakeComplex,
}: TaskComplexityToggleProps) => (
  <div
    className="flex flex-wrap items-center gap-2 rounded-lg border border-border-subtle bg-white/[0.02] px-3 py-2"
    data-test-id="task-complexity-toggle"
  >
    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-text-muted">
      Task type
    </span>
    <StatusBadge tone={isSimpleTask ? 'cyan' : 'amber'}>
      {isSimpleTask ? 'Simple' : 'Complex'}
    </StatusBadge>
    {isSimpleTask ? (
      <GlowButton
        variant="subtle"
        size="sm"
        leftIcon={<Layers size={12} />}
        loading={isPending}
        disabled={disabled || isPending}
        onClick={onMakeComplex}
        data-test-id="task-complexity-make-complex"
      >
        Break into steps
      </GlowButton>
    ) : (
      <GlowButton
        variant="subtle"
        size="sm"
        leftIcon={<Zap size={12} />}
        loading={isPending}
        disabled={disabled || isPending}
        onClick={onMakeSimple}
        data-test-id="task-complexity-make-simple"
      >
        Treat as simple task
      </GlowButton>
    )}
  </div>
);
