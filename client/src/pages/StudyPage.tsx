import { useState, useEffect } from 'react';
import { Plus, GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageScroll } from '@/components/layout/PageScroll';
import { WorkSwitcher } from '@/components/nav/WorkSwitcher';
import { setLastWorkView } from '@/lib/workView';
import { AnimatedPage } from '@/components/motion/AnimatedPage';
import { StaggerItem } from '@/components/motion/StaggerItem';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCreateStudyTopic, useStudyTopics } from '@/hooks/useStudyTopics';
import { formatRelative } from '@/lib/format';
import { useResources } from '@/hooks/useResources';

const CONFIDENCE_TONE: Record<string, 'cyan' | 'neon' | 'amber' | 'danger' | 'muted'> = {
  high: 'neon',
  medium: 'cyan',
  low: 'amber',
};

export const StudyPage = () => {
  const { data: topics, isLoading } = useStudyTopics();
  const create = useCreateStudyTopic();
  const resources = useResources();
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');

  useEffect(() => {
    setLastWorkView('study');
  }, []);

  const handleCreate = async () => {
    if (!subject.trim() || !topic.trim()) return;
    await create.mutateAsync({ subject: subject.trim(), topic: topic.trim(), weakTopics: [] });
    setTopic('');
  };

  return (
    <PageScroll>
      <AnimatedPage>
        <StaggerItem index={0}>
          <WorkSwitcher />
        </StaggerItem>
        <StaggerItem index={1}>
          <PageHeader
            title="Study"
        description="Track confidence, mock scores, and weak topics across subjects."
        action={
          <div className="flex flex-wrap gap-2">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject (e.g. PPL)"
              className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main focus:border-border-accent focus:outline-none"
            />
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Topic (e.g. Communication)"
              className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main focus:border-border-accent focus:outline-none"
            />
            <GlowButton
              leftIcon={<Plus size={14} />}
              onClick={handleCreate}
              loading={create.isPending}
              disabled={!subject.trim() || !topic.trim()}
            >
              Add topic
            </GlowButton>
          </div>
        }
      />
        </StaggerItem>

        <StaggerItem index={2}>
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : (topics?.length ?? 0) === 0 ? (
        <GlassCard interactive className="p-6">
          <EmptyState
            icon={<GraduationCap size={28} />}
            title="No study topics yet."
            description="Add a subject or let AI create study topics from your goal."
          />
        </GlassCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(topics ?? []).map((t) => (
            <GlassCard
              key={t.id}
              variant={t.confidence === 'low' ? 'amber' : 'default'}
              interactive
              className="p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                    {t.subject}
                  </div>
                  <h3 className="mt-0.5 text-base font-semibold text-text-main">{t.topic}</h3>
                </div>
                <StatusBadge tone={CONFIDENCE_TONE[t.confidence] ?? 'muted'} dot>
                  {t.confidence}
                </StatusBadge>
              </div>

              {t.mockScore !== null && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Mock score</div>
                  <div className="mt-0.5 font-mono text-lg text-text-main">{t.mockScore}%</div>
                </div>
              )}

              {t.weakTopics.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Weak topics</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.weakTopics.map((wt) => (
                      <StatusBadge tone="amber" key={wt}>
                        {wt}
                      </StatusBadge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-[11px] text-text-muted">
                <span>Last: {formatRelative(t.lastStudiedAt)}</span>
                <span>Total: {Math.round(t.totalMinutes / 60)}h</span>
              </div>

              <div className="mt-3 border-t border-border-subtle pt-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Resources</div>
                <ul className="mt-1 space-y-1">
                  {(resources.data ?? [])
                    .filter((resource) => resource.studyTopicId === t.id)
                    .slice(0, 3)
                    .map((resource) => (
                      <li key={resource.id} className="text-xs text-text-soft">
                        {resource.url ? (
                          <a href={resource.url} target="_blank" rel="noreferrer" className="text-cyan-300">
                            {resource.title}
                          </a>
                        ) : (
                          resource.title
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
        </StaggerItem>
      </AnimatedPage>
    </PageScroll>
  );
};
