import { type FormEvent, useState } from 'react';
import { Inbox, Sparkles } from 'lucide-react';
import type { ParseResponse } from '@command-center/shared';
import { PageHeader } from '@/components/PageHeader';
import { PageScroll } from '@/components/layout/PageScroll';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { ParseResultCard } from '@/components/command/ParseResultCard';
import { PendingCapturesPanel } from '@/components/inbox/PendingCapturesPanel';
import { useParseBrainDump } from '@/hooks/useNavigator';
import { ApiError } from '@/lib/api';

const PLACEHOLDER = `I need food at home and I also need to get better at radio communication.

I spent 200 EUR on groceries today, enough for 5 days.`;

export const InboxPage = () => {
  const [text, setText] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [result, setResult] = useState<ParseResponse | null>(null);
  const parse = useParseBrainDump();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setSubmittedText(t);
    setResult(null);
    try {
      const r = await parse.mutateAsync({ text: t });
      setResult(r);
    } catch {
      // surfaced via parse.error below
    }
  };

  const apiError = parse.error instanceof ApiError ? parse.error : null;

  return (
    <PageScroll>
      <PageHeader
        title="AI Inbox"
        description="Dump messy thoughts. Navigator will classify them into tasks, goals, problems, expenses, or notes."
      />

      <div className="mb-4">
        <PendingCapturesPanel />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <GlassCard variant="cyan" className="p-5">
          <form onSubmit={handleSubmit}>
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">Brain dump</div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={PLACEHOLDER}
              className="mt-2 w-full resize-y rounded-lg border border-border-subtle bg-bg-deep/60 p-3 text-sm leading-relaxed text-text-main placeholder:text-text-muted focus:border-border-accent focus:outline-none"
              data-test-id="inbox-text"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-text-muted">
                Tip: write multiple sentences. Navigator handles batches.
              </p>
              <GlowButton
                type="submit"
                leftIcon={<Sparkles size={14} />}
                loading={parse.isPending}
                disabled={!text.trim()}
                data-test-id="inbox-submit"
              >
                Classify
              </GlowButton>
            </div>
            {apiError && (
              <div className="mt-3 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger-400">
                {apiError.message}
              </div>
            )}
          </form>
        </GlassCard>

        <div>
          {!result ? (
            <GlassCard className="flex h-full flex-col items-center justify-center p-8 text-center">
              <Inbox size={28} className="text-cyan/70" />
              <p className="mt-3 text-sm text-text-soft">
                Drop a thought on the left and Navigator will detect tasks, goals, problems and
                logs in it.
              </p>
            </GlassCard>
          ) : (
            <ParseResultCard
              result={result}
              rawInput={submittedText}
              onClose={() => {
                setResult(null);
                setText('');
              }}
            />
          )}
        </div>
      </div>
    </PageScroll>
  );
};
