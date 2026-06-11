import { Lightbulb, Sparkles } from 'lucide-react';
import { DISTRACTION_CATEGORY_LABELS } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFocusInsight, useGenerateFocusInsight } from '@/hooks/useFocus';

const isToday = (iso: string): boolean => {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

export const FocusInsightsCard = () => {
  const { data: insight, isLoading } = useFocusInsight();
  const generateInsight = useGenerateFocusInsight();
  const generatedToday = insight ? isToday(insight.generatedAt) : false;

  const handleGenerate = () => {
    generateInsight.mutate();
  };

  return (
    <GlassCard className="p-5" data-test-id="focus-insights-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} className="text-neon" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">
              Focus coach
            </div>
            <h3 className="mt-0.5 text-sm font-semibold text-text-main">
              Personalized advice
            </h3>
          </div>
        </div>
        <GlowButton
          size="sm"
          variant="ghost"
          leftIcon={<Sparkles size={14} />}
          loading={generateInsight.isPending}
          disabled={generatedToday && !generateInsight.isPending}
          onClick={handleGenerate}
          data-test-id="focus-generate-insight"
        >
          {generatedToday ? 'Generated today' : 'Generate insights'}
        </GlowButton>
      </div>

      {isLoading || generateInsight.isPending ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      ) : !insight ? (
        <p className="mt-4 text-sm text-text-soft">
          Log a few focus sessions, then generate insights to see your top distractions and
          practical tips to stay focused longer.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {insight.topDistractions.length > 0 && (
            <div>
              <div className="text-xs font-medium text-text-muted">Top distractions</div>
              <ul className="mt-2 space-y-1.5">
                {insight.topDistractions.map((item, index) => (
                  <li
                    key={`${item.category}-${index}`}
                    className="flex items-center justify-between text-sm text-text-main"
                  >
                    <span>
                      {index + 1}. {item.label || DISTRACTION_CATEGORY_LABELS[item.category]}
                    </span>
                    <span className="text-xs text-text-muted">{item.count}x</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="text-xs font-medium text-text-muted">Advice</div>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-soft">
              {insight.advice}
            </p>
          </div>
          <p className="text-[11px] text-text-muted">
            Based on {insight.sessionsAnalyzed} session
            {insight.sessionsAnalyzed === 1 ? '' : 's'} ·{' '}
            {new Date(insight.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </GlassCard>
  );
};
