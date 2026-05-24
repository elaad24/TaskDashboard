import { useState } from 'react';
import { Compass, Play } from 'lucide-react';
import type { MissionBriefing, NextActionResponse } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useNextAction } from '@/hooks/useNavigator';
import { formatMinutes } from '@/lib/format';

type MissionBriefingCardProps = {
  briefing: MissionBriefing | null;
  loading?: boolean;
};

export const MissionBriefingCard = ({ briefing, loading }: MissionBriefingCardProps) => {
  const nextActionMutation = useNextAction();
  const [aiResult, setAiResult] = useState<NextActionResponse | null>(null);

  const handleStart = async () => {
    setAiResult(null);
    const r = await nextActionMutation.mutateAsync({});
    setAiResult(r);
  };

  if (loading) {
    return (
      <GlassCard variant="cyan" glow interactive className="p-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-6 w-2/3" />
        <Skeleton className="mt-2 h-4 w-3/4" />
        <Skeleton className="mt-4 h-9 w-40" />
      </GlassCard>
    );
  }

  if (!briefing && !aiResult) {
    return (
      <GlassCard variant="cyan" interactive className="p-6">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
          <Compass size={12} />
          Mission Briefing
          <StatusBadge tone="cyan" className="ml-2">
            AI generated
          </StatusBadge>
        </div>
        <EmptyState
          className="mt-4"
          icon={<Compass size={24} />}
          title="No mission yet."
          description="Capture a thought in the command bar above to generate today's briefing."
        />
      </GlassCard>
    );
  }

  const main = aiResult?.primary;
  const display = main
    ? {
        mainFocus: main.title,
        why: main.reason,
        recommendedMinutes: main.estimatedMinutes,
        primaryAction: main.title,
        navigatorMessage: aiResult?.navigatorMessage ?? null,
      }
    : briefing!;

  return (
    <GlassCard variant="cyan" glow interactive className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
          <Compass size={12} />
          Mission Briefing
          <StatusBadge tone="cyan" className="ml-2">
            AI generated
          </StatusBadge>
        </div>
        <StatusBadge tone="neon" dot>
          ~{formatMinutes(display.recommendedMinutes)}
        </StatusBadge>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Main focus</div>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-text-main">
            {display.mainFocus}
          </h2>

          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Why</div>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-soft">{display.why}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Recommended time</div>
            <div className="mt-1 font-mono text-lg text-text-main">
              {formatMinutes(display.recommendedMinutes)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Primary action</div>
            <div className="mt-1 text-sm text-text-main">{display.primaryAction}</div>
          </div>
          <GlowButton
            leftIcon={<Play size={14} />}
            onClick={handleStart}
            loading={nextActionMutation.isPending}
            data-test-id="briefing-start-focus"
          >
            Start Focus Session
          </GlowButton>
        </div>
      </div>

      {aiResult?.backup && (
        <div className="mt-5 rounded-lg border border-border-subtle bg-white/[0.02] p-3 text-xs text-text-soft">
          <span className="text-text-muted">Backup option: </span>
          <span className="text-text-main">{aiResult.backup.title}</span>
          <span className="text-text-muted"> -- {aiResult.backup.reason}</span>
        </div>
      )}

      {display.navigatorMessage && (
        <div className="mt-3 text-xs italic text-text-soft">
          Navigator says: {display.navigatorMessage}
        </div>
      )}
    </GlassCard>
  );
};
