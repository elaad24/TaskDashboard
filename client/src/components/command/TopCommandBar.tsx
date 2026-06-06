import { type FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, AlertCircle, Sparkles, X } from 'lucide-react';
import { useCommandQueue } from '@/hooks/useCommandQueue';
import { NavigatorOrb } from './NavigatorOrb';
import { NavigatorThinking } from './NavigatorThinking';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { KBD } from '@/components/ui/KBD';
import { ParseResultCard } from '@/components/command/ParseResultCard';

const SUGGESTIONS = [
  'I have trouble remembering radio communication',
  'The fridge is almost empty',
  'I need to finish PPL theory fast',
  'I spent 200 EUR on groceries today',
  'What should I do next?',
];

export const TopCommandBar = () => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    enqueue,
    removeFromQueue,
    displayQueue,
    activeEntry,
    results,
    errors,
    dismissResult,
    dismissError,
    isProcessing,
  } = useCommandQueue();

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    enqueue(trimmed);
    setText(''); // clear immediately so the user can start typing the next thing
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  const showSuggestions = !isProcessing && displayQueue.length === 0 && results.length === 0;
  const queueCount = displayQueue.length + (isProcessing ? 1 : 0);

  return (
    <div className="sticky top-0 z-30 px-4 pb-4 pt-6 md:px-8">
      <GlassCard variant="cyan" className="p-4 md:p-5">
        <form onSubmit={handleSubmit} aria-label="Navigator command bar">
          <div className="flex items-start gap-4">
            <div className="pt-0.5">
              <NavigatorOrb size={36} state={isProcessing ? 'thinking' : 'idle'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
                <Sparkles size={12} />
                Navigator
                <span className="text-text-muted">// command console</span>
                {queueCount > 0 && (
                  <span className="ml-1 rounded-full bg-cyan/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                    {queueCount} in queue
                  </span>
                )}
              </div>

              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask Command Center anything... (Enter to queue, Shift+Enter for new line)"
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
                  <span>queue</span>
                </div>
                <NavigatorThinking active={isProcessing} activeText={activeEntry?.text} />
              </div>
            </div>

            <GlowButton
              type="submit"
              size="lg"
              disabled={!text.trim()}
              rightIcon={<ArrowRight size={14} />}
              data-test-id="command-submit"
            >
              {isProcessing ? 'Queue' : 'Analyze'}
            </GlowButton>
          </div>
        </form>

        {/* Queue pills — items waiting to be processed */}
        <AnimatePresence>
          {displayQueue.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-widest text-text-muted">
                  Queued
                </span>
                {displayQueue.map((entry) => (
                  <motion.span
                    key={entry.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex max-w-[200px] items-center gap-1 rounded-full border border-border-subtle bg-white/[0.04] px-3 py-1 text-[11px] text-text-soft"
                  >
                    <span className="truncate" title={entry.text}>
                      {entry.text.length > 30 ? `${entry.text.slice(0, 30)}…` : entry.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromQueue(entry.id)}
                      className="ml-0.5 shrink-0 rounded-full p-0.5 hover:bg-white/10 hover:text-text-main"
                      aria-label={`Remove "${entry.text}" from queue`}
                    >
                      <X size={10} />
                    </button>
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestion chips — only show when idle and no results pending review */}
        {showSuggestions && (
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
      </GlassCard>

      {/* Per-item errors */}
      <AnimatePresence>
        {errors.map((err) => (
          <motion.div
            key={err.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-3"
          >
            <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs text-danger-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{err.code}</div>
                <div className="truncate text-text-soft" title={err.text}>
                  Input: "{err.text.length > 60 ? `${err.text.slice(0, 60)}…` : err.text}"
                </div>
                <div className="mt-0.5 text-text-soft">{err.message}</div>
              </div>
              <button
                type="button"
                onClick={() => dismissError(err.id)}
                className="shrink-0 rounded p-1 hover:bg-white/5"
                aria-label="Dismiss error"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Stacked result cards — one per completed queue item */}
      <AnimatePresence>
        {results.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="mt-3"
          >
            <ParseResultCard
              result={entry.result}
              rawInput={entry.text}
              onClose={() => dismissResult(entry.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
