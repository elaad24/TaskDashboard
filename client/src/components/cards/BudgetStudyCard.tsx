import { Wallet, GraduationCap } from 'lucide-react';
import type { BudgetSnapshot, StudySnapshot } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatMinutes } from '@/lib/format';

type BudgetStudyCardProps = {
  budget: BudgetSnapshot;
  study: StudySnapshot;
  loading?: boolean;
};

export const BudgetStudyCard = ({ budget, study, loading }: BudgetStudyCardProps) => {
  if (loading) {
    return (
      <GlassCard interactive className="flex h-full flex-col p-5">
        <SectionHeader title="Budget & Study" />
        <Skeleton className="mt-4 h-16 w-full" />
        <Skeleton className="mt-3 h-16 w-full" />
      </GlassCard>
    );
  }

  return (
    <GlassCard interactive className="flex h-full flex-col p-5">
      <SectionHeader title="Budget & Study" />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border-subtle bg-white/[0.02] p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-text-muted">
            <Wallet size={11} /> Spend (month)
          </div>
          <div className="mt-1.5 font-mono text-lg text-neon">
            {formatCurrency(budget.monthSpend, budget.currency)}
          </div>
          <div className="text-[11px] text-text-soft">
            This week: {formatCurrency(budget.weekSpend, budget.currency)}
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-white/[0.02] p-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-text-muted">
            <GraduationCap size={11} /> Study (week)
          </div>
          <div className="mt-1.5 font-mono text-lg text-cyan">{formatMinutes(study.minutesThisWeek)}</div>
          <div className="text-[11px] text-text-soft">
            {study.topicCount} topic{study.topicCount === 1 ? '' : 's'}
            {study.averageMockScore !== null && ` · avg mock ${study.averageMockScore}%`}
          </div>
        </div>
      </div>

      {budget.byArea.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted">By area (month)</div>
          <ul className="mt-1.5 space-y-1.5">
            {budget.byArea.slice(0, 4).map((b) => (
              <li
                key={b.areaId ?? 'other'}
                className="flex items-center justify-between text-xs text-text-soft"
              >
                <span>{b.areaName}</span>
                <span className="font-mono text-text-main">
                  {formatCurrency(b.total, budget.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {study.weakTopics.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Weak topics</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {study.weakTopics.slice(0, 6).map((t) => (
              <StatusBadge tone="amber" key={t}>
                {t}
              </StatusBadge>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
};
