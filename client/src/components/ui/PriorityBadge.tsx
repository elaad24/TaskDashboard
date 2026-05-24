import type { Priority } from '@command-center/shared';
import { StatusBadge } from './StatusBadge';

const tone: Record<Priority, 'muted' | 'cyan' | 'amber' | 'danger'> = {
  low: 'muted',
  medium: 'cyan',
  high: 'amber',
  critical: 'danger',
};

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <StatusBadge tone={tone[priority]} dot>
    {priority}
  </StatusBadge>
);
