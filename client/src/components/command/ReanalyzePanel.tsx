import { type FormEvent, useEffect, useRef, useState } from 'react';
import { GlowButton } from '@/components/ui/GlowButton';

type ReanalyzePanelProps = {
  isPending: boolean;
  onSubmit: (correction: string) => void;
  onCancel: () => void;
};

export const ReanalyzePanel = ({ isPending, onSubmit, onCancel }: ReanalyzePanelProps) => {
  const [correction, setCorrection] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = correction.trim();
    if (!trimmed || isPending) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-border-accent bg-cyan/5 p-3"
      data-test-id="reanalyze-panel"
    >
      <label htmlFor="reanalyze-correction" className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
        Tell Navigator what to change
      </label>
      <textarea
        ref={textareaRef}
        id="reanalyze-correction"
        value={correction}
        onChange={(e) => setCorrection(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={isPending}
        placeholder="e.g. this is a simple task, don't split it — or: this needs a full breakdown with study steps"
        className="mt-2 w-full resize-y rounded-lg border border-border-subtle bg-bg-deep/60 p-3 text-sm leading-relaxed text-text-main placeholder:text-text-muted focus:border-border-accent focus:outline-none disabled:opacity-60"
        data-test-id="reanalyze-input"
      />
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <GlowButton type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </GlowButton>
        <GlowButton
          type="submit"
          loading={isPending}
          disabled={!correction.trim()}
          data-test-id="reanalyze-submit"
        >
          Re-analyze
        </GlowButton>
      </div>
    </form>
  );
};
