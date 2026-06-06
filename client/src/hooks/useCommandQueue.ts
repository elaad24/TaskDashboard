import { useCallback, useRef, useState } from 'react';
import type { ParseResponse } from '@command-center/shared';
import { useParseBrainDump } from './useNavigator';
import { ApiError } from '@/lib/api';

export type QueuedEntry = { id: string; text: string };
export type ResultEntry = { id: string; text: string; result: ParseResponse };
export type ErrorEntry = { id: string; text: string; message: string; code: string };

/**
 * Manages a FIFO queue of brain-dump texts to send to the AI.
 * Items are processed one at a time. The queue itself is kept in a ref so the
 * processNext callback never captures stale state, while display-only values
 * are kept in useState so React re-renders correctly.
 */
export const useCommandQueue = () => {
  const internalQueue = useRef<Array<QueuedEntry>>([]);
  const isRunningRef = useRef(false);

  const [displayQueue, setDisplayQueue] = useState<Array<QueuedEntry>>([]);
  const [activeEntry, setActiveEntry] = useState<QueuedEntry | null>(null);
  const [results, setResults] = useState<Array<ResultEntry>>([]);
  const [errors, setErrors] = useState<Array<ErrorEntry>>([]);

  const parseMutation = useParseBrainDump();

  // Always call the latest mutateAsync without capturing a stale ref in processNext
  const mutateAsyncRef = useRef(parseMutation.mutateAsync);
  mutateAsyncRef.current = parseMutation.mutateAsync;

  const processNext = useCallback(() => {
    if (isRunningRef.current || internalQueue.current.length === 0) return;

    const entry = internalQueue.current.shift()!;
    setDisplayQueue([...internalQueue.current]);
    isRunningRef.current = true;
    setActiveEntry(entry);

    mutateAsyncRef.current({ text: entry.text })
      .then((result) => {
        setResults((prev) => [...prev, { id: entry.id, text: entry.text, result }]);
      })
      .catch((err: unknown) => {
        const code = err instanceof ApiError ? err.code : 'AI_ERROR';
        const message = err instanceof Error ? err.message : 'Unknown error';
        setErrors((prev) => [...prev, { id: entry.id, text: entry.text, message, code }]);
      })
      .finally(() => {
        isRunningRef.current = false;
        setActiveEntry(null);
        processNext();
      });
  }, []); // stable — only uses refs

  const enqueue = useCallback(
    (text: string) => {
      const entry: QueuedEntry = { id: crypto.randomUUID(), text };
      internalQueue.current.push(entry);
      setDisplayQueue([...internalQueue.current]);
      processNext();
    },
    [processNext],
  );

  const removeFromQueue = useCallback((id: string) => {
    internalQueue.current = internalQueue.current.filter((e) => e.id !== id);
    setDisplayQueue([...internalQueue.current]);
  }, []);

  const dismissResult = useCallback((id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const dismissError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return {
    enqueue,
    removeFromQueue,
    displayQueue,
    activeEntry,
    results,
    errors,
    dismissResult,
    dismissError,
    isProcessing: activeEntry !== null,
  };
};
