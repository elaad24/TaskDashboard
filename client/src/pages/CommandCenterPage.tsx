import { useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { useUrgency } from '@/hooks/useUrgency';
import { useStreak } from '@/hooks/useStreak';
import { MissionBriefingCard } from '@/components/cards/MissionBriefingCard';
import { NextActionsCard } from '@/components/cards/NextActionsCard';
import { ActiveGoalsCard } from '@/components/cards/ActiveGoalsCard';
import { TracksCard } from '@/components/cards/TracksCard';
import { ProblemsCard } from '@/components/cards/ProblemsCard';
import { RecentLogsCard } from '@/components/cards/RecentLogsCard';
import { BudgetStudyCard } from '@/components/cards/BudgetStudyCard';
import { UrgencyEngineCard } from '@/components/cards/UrgencyEngineCard';
import { StreakHeatmapCard } from '@/components/cards/StreakHeatmapCard';
import { MissionStatusStrip } from '@/components/hud/MissionStatusStrip';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { PageScroll } from '@/components/layout/PageScroll';
import { AnimatedPage } from '@/components/motion/AnimatedPage';
import { StaggerItem } from '@/components/motion/StaggerItem';

export const CommandCenterPage = () => {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const urgency = useUrgency();
  const [streakAreaId, setStreakAreaId] = useState<string | undefined>(undefined);
  const streak = useStreak(streakAreaId);

  if (isError) {
    return (
      <PageScroll>
        <GlassCard variant="danger" glow className="p-6">
          <h2 className="text-base font-semibold text-text-main">Could not load dashboard</h2>
          <p className="mt-2 text-sm text-text-soft">
            {(error as Error)?.message ?? 'Something went wrong contacting the server.'}
          </p>
          <GlowButton variant="ghost" className="mt-4" onClick={() => refetch()}>
            Retry
          </GlowButton>
        </GlassCard>
      </PageScroll>
    );
  }

  return (
    <PageScroll>
      <AnimatedPage className="space-y-4 pb-2" data-test-id="command-center-layout">
        <StaggerItem index={0}>
          <MissionStatusStrip
            summary={urgency.data?.summary ?? 'Loading mission telemetry…'}
            status={urgency.data?.overallStatus ?? 'on_track'}
            loading={urgency.isLoading}
          />
        </StaggerItem>

        <StaggerItem index={1}>
          <div className="grid gap-4 lg:grid-cols-2">
            <MissionBriefingCard briefing={data?.briefing ?? null} loading={isLoading} />
            <UrgencyEngineCard
              metrics={urgency.data?.metrics ?? []}
              currency={urgency.data?.currency ?? 'EUR'}
              loading={urgency.isLoading}
            />
          </div>
        </StaggerItem>

        <StaggerItem index={2}>
          <div className="grid gap-4 lg:grid-cols-2">
            <NextActionsCard tasks={data?.nextActions ?? []} loading={isLoading} />
            <ActiveGoalsCard goals={data?.activeGoals ?? []} loading={isLoading} />
          </div>
        </StaggerItem>

        <StaggerItem index={3}>
          <div className="grid gap-4 lg:grid-cols-2">
            <TracksCard tracks={data?.tracks ?? []} loading={isLoading} />
            <ProblemsCard problems={data?.problems ?? []} loading={isLoading} />
          </div>
        </StaggerItem>

        <StaggerItem index={4}>
          <StreakHeatmapCard
            days={streak.data?.days ?? []}
            currentStreak={streak.data?.currentStreak ?? 0}
            longestStreak={streak.data?.longestStreak ?? 0}
            loading={streak.isLoading}
            areaId={streakAreaId}
            onAreaChange={setStreakAreaId}
          />
        </StaggerItem>

        <StaggerItem index={5}>
          <div className="grid gap-4 lg:grid-cols-2">
            <RecentLogsCard logs={data?.recentLogs ?? []} loading={isLoading} />
            <BudgetStudyCard
              budget={data?.budget ?? { monthSpend: 0, weekSpend: 0, currency: 'EUR', byArea: [] }}
              study={
                data?.study ?? {
                  topicCount: 0,
                  weakTopics: [],
                  averageMockScore: null,
                  minutesThisWeek: 0,
                }
              }
              loading={isLoading}
            />
          </div>
        </StaggerItem>
      </AnimatedPage>
    </PageScroll>
  );
};
