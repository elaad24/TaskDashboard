import { useEffect, useState } from 'react';

type UseTypewriterOptions = {
  speedMs?: number;
  enabled?: boolean;
};

/**
 * Reveals `text` one character at a time so Navigator feels like it's actually
 * speaking. When `enabled` is false (e.g. reduced motion) the full text is
 * returned immediately and `isDone` is true.
 */
export const useTypewriter = (
  text: string,
  { speedMs = 18, enabled = true }: UseTypewriterOptions = {},
): { displayed: string; isDone: boolean; skip: () => void } => {
  const [displayed, setDisplayed] = useState(enabled ? '' : text);
  const [isDone, setIsDone] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(text);
      setIsDone(true);
      return;
    }

    setDisplayed('');
    setIsDone(false);

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
        setIsDone(true);
      }
    }, speedMs);

    return () => window.clearInterval(timer);
  }, [text, speedMs, enabled]);

  const skip = (): void => {
    setDisplayed(text);
    setIsDone(true);
  };

  return { displayed, isDone, skip };
};
