import { type FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import type { ParseResponse } from '@command-center/shared';
import { useParseBrainDump } from '@/hooks/useNavigator';
import { NavigatorOrb } from './NavigatorOrb';
import { NavigatorThinking } from './NavigatorThinking';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { KBD } from '@/components/ui/KBD';
import { AIRecommendationCard } from '@/components/cards/AIRecommendationCard';
import { ApiError } from '@/lib/api';

const SUGGESTIONS = [
  'I have trouble remembering radio communication',
  'The fridge is almost empty',
  'I need to finish PPL theory fast',
  'I spent 200 EUR on groceries today',
  'What should I do next?',
];

export const TopCommandBar = () => {
  const [text, setText] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [result, setResult] = useState<ParseResponse | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const parseMutation = useParseBrainDump();

  // ⌘K / Ctrl+K to focus the command bar from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmittedText(trimmed);
    setResult(null);
    try {
      const r = await parseMutation.mutateAsync(trimmed);
      setResult(r);
    } catch {
      // Surface error via parseMutation.error below.
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as FormEvent);
    }
  };

  const handleClose = () => {
    setResult(null);
    setSubmittedText('');
    setText('');
    parseMutation.reset();
  };

  const apiError =
    parseMutation.error instanceof ApiError ? parseMutation.error : null;

  return (
    <div className="sticky top-0 z-30 px-4 pb-4 pt-6 md:px-8">
      <GlassCard variant="cyan" className="p-4 md:p-5">
        <form onSubmit={handleSubmit} aria-label="Navigator command bar">
          <div className="flex items-start gap-4">
            <div className="pt-0.5">
              <NavigatorOrb size={36} state={parseMutation.isPending ? 'thinking' : 'idle'} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
                <Sparkles size={12} />
                Navigator
                <span className="text-text-muted">// command console</span>
              </div>

              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask Command Center anything... (e.g. 'I have trouble with radio communication')"
                className="mt-1 w-full resize-none bg-transparent text-base font-medium leading-relaxed text-text-main placeholder:text-text-muted focus:outline-none"
                aria-label="Type a thought, task, or question"
                data-test-id="command-input"
              />

              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-text-muted">
                <div className="flex flex-wrap items-center gap-1.5">
                  <KBD>⌘</KBD>
                  <KBD>K</KBD>
                  <span>focus</span>
                  <span className="mx-1 text-text-muted">·</span>
                  <KBD>Enter</KBD>
                  <span>analyze</span>
                </div>
                <NavigatorThinking active={parseMutation.isPending} />
              </div>
            </div>

            <GlowButton
              type="submit"
              size="lg"
              loading={parseMutation.isPending}
              disabled={!text.trim()}
              rightIcon={<ArrowRight size={14} />}
              data-test-id="command-submit"
            >
              Analyze
            </GlowButton>
          </div>
        </form>

        {!result && !parseMutation.isPending && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setText(s);
                  inputRef.current?.focus();
                }}
                className="rounded-full border border-border-subtle bg-white/[0.02] px-3 py-1 text-[11px] text-text-soft hover:border-border-accent hover:text-text-main"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {apiError && !parseMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger-400"
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">{apiError.code}</div>
              <div className="text-text-soft">{apiError.message}</div>
            </div>
          </motion.div>
        )}
      </GlassCard>

      <AnimatePresence>
        {result && (
          <div className="mt-3">
            <AIRecommendationCard
              result={result}
              rawInput={submittedText}
              onClose={handleClose}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
