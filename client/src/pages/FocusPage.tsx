import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { FocusTimer } from '@/components/focus/FocusTimer';
import { FocusStats } from '@/components/focus/FocusStats';
import { FocusInsightsCard } from '@/components/focus/FocusInsightsCard';
import { cn } from '@/lib/cn';

type Tab = 'tracker' | 'analytics';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'tracker', label: 'Tracker' },
  { key: 'analytics', label: 'Analytics' },
];

export const FocusPage = () => {
  const [tab, setTab] = useState<Tab>('tracker');

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain">
      <div className="mt-6" />
      <PageHeader
        title="Focus"
        description="Track how long you stay focused, understand what interrupts you, and get advice to improve."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] transition-all',
              tab === t.key
                ? 'border-border-accent-strong bg-cyan/10 text-cyan-200'
                : 'border-border-subtle bg-white/[0.02] text-text-soft hover:border-border-accent hover:text-text-main',
            )}
            data-test-id={`focus-tab-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tracker' ? (
        <div className="flex flex-1 items-start justify-center pt-8">
          <div className="w-full pt-12 max-w-xl">
            <FocusTimer />
          </div>
        </div>
      ) : (
        <div className="space-y-4 pb-8">
          <FocusStats />
          <FocusInsightsCard />
        </div>
      )}
    </div>
  );
};
