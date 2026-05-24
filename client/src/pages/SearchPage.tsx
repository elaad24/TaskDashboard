import { useState } from 'react';
import { Search as SearchIcon, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageScroll } from '@/components/layout/PageScroll';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSearch } from '@/hooks/useSearch';
import { formatCurrency, formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

const TYPES = ['task', 'log', 'goal', 'problem', 'studyTopic'] as const;
type SearchType = (typeof TYPES)[number];

const typeLabel: Record<SearchType, string> = {
  task: 'Tasks',
  log: 'Logs',
  goal: 'Goals',
  problem: 'Problems',
  studyTopic: 'Study',
};

const EXAMPLES = [
  'groceries',
  'radio communication',
  '200 EUR',
  'flight school',
  'Air Law',
];

export const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('');
  const [enabledTypes, setEnabledTypes] = useState<Array<SearchType>>([...TYPES]);
  const { data, isLoading, isFetching } = useSearch(active, enabledTypes);

  const submit = () => setActive(query.trim());

  const toggleType = (t: SearchType) => {
    setEnabledTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  return (
    <PageScroll>
      <PageHeader
        title="Search"
        description="Find anything you did, spent, studied, or planned."
      />

      <GlassCard variant="cyan" className="p-4">
        <div className="flex items-center gap-2">
          <SearchIcon size={16} className="text-cyan" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Search anything you did, spent, studied, or planned..."
            className="flex-1 bg-transparent text-base text-text-main placeholder:text-text-muted focus:outline-none"
            data-test-id="search-input"
          />
          <GlowButton onClick={submit} disabled={!query.trim()}>
            Search
          </GlowButton>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-text-muted">Types:</span>
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider transition-all',
                enabledTypes.includes(t)
                  ? 'border-border-accent-strong bg-cyan/10 text-cyan-200'
                  : 'border-border-subtle text-text-soft',
              )}
            >
              {typeLabel[t]}
            </button>
          ))}
          <span className="text-[11px] text-text-muted">·</span>
          <span className="text-[11px] text-text-muted">Try:</span>
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                setQuery(e);
                setActive(e);
              }}
              className="rounded-full border border-border-subtle bg-white/[0.02] px-2.5 py-0.5 text-[10px] text-text-soft hover:border-border-accent hover:text-text-main"
            >
              {e}
            </button>
          ))}
        </div>
      </GlassCard>

      <div className="mt-4 space-y-4">
        {!active ? (
          <GlassCard className="p-6">
            <EmptyState
              title="Search across your history"
              description="Tasks, logs, goals, problems and study topics. Navigator will summarize the answer."
            />
          </GlassCard>
        ) : isLoading || isFetching ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            {data?.summary && (
              <GlassCard variant="cyan" glow className="p-5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                  <Sparkles size={12} /> Navigator summary
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-main">
                  {data.summary}
                </p>
                {data.totals && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <StatusBadge tone="muted">{data.totals.count} hits</StatusBadge>
                    {data.totals.totalCost !== null && data.totals.totalCost !== undefined && (
                      <StatusBadge tone="neon">
                        Total: {formatCurrency(data.totals.totalCost, 'EUR')}
                      </StatusBadge>
                    )}
                  </div>
                )}
              </GlassCard>
            )}

            <GlassCard className="p-4">
              {(data?.hits.length ?? 0) === 0 ? (
                <EmptyState
                  title={`No results for "${active}"`}
                  description="Try different keywords or untoggle a type filter."
                />
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {data!.hits.map((hit) => (
                    <li key={`${hit.type}-${hit.id}`} className="flex items-start gap-3 py-2.5">
                      <StatusBadge tone="cyan" className="mt-0.5 shrink-0">
                        {typeLabel[hit.type]}
                      </StatusBadge>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-text-main">{hit.title}</div>
                        {hit.snippet && (
                          <p
                            className="fts-snippet mt-0.5 text-xs text-text-soft"
                            dangerouslySetInnerHTML={{ __html: hit.snippet }}
                          />
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                          <span>{formatRelative(hit.occurredAt)}</span>
                          {hit.costAmount !== null && (
                            <span className="text-neon">
                              {formatCurrency(hit.costAmount, hit.costCurrency)}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          </>
        )}
      </div>
    </PageScroll>
  );
};
