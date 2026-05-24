import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FeedItem } from '@command-center/shared';
import { collectRotationPool } from '@command-center/shared';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSidebarFeed } from '@/hooks/useSidebarFeed';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const ROTATION_MS = 120_000;

const pickRandomItem = (pool: Array<FeedItem>, excludeId?: string): FeedItem | null => {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0] ?? null;

  const candidates = excludeId ? pool.filter((item) => item.id !== excludeId) : pool;
  const source = candidates.length > 0 ? candidates : pool;
  const index = Math.floor(Math.random() * source.length);
  return source[index] ?? null;
};

const tickerContentClass = 'w-full min-w-0';

const tickerWrapperClass =
  'mt-auto w-full min-w-0 shrink-0 border-t border-border-subtle bg-bg-mid/30 px-3 py-3';

const tickerTextClass =
  'break-words text-pretty text-base leading-relaxed text-text-main';

export const SidebarFeedTicker = () => {
  const feed = useSidebarFeed();
  const reducedMotion = useReducedMotion();
  const pool = useMemo(
    () => collectRotationPool(feed.data?.groups ?? []),
    [feed.data?.groups],
  );
  const [current, setCurrent] = useState<FeedItem | null>(null);
  const currentIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (pool.length === 0) {
      setCurrent(null);
      currentIdRef.current = undefined;
      return;
    }

    const initial = pickRandomItem(pool);
    setCurrent(initial);
    currentIdRef.current = initial?.id;

    const id = window.setInterval(() => {
      setCurrent((prev) => {
        const next = pickRandomItem(pool, prev?.id);
        currentIdRef.current = next?.id;
        return next;
      });
    }, ROTATION_MS);

    return () => window.clearInterval(id);
  }, [pool]);

  if (feed.isLoading) {
    return (
      <div className={tickerWrapperClass} data-test-id="sidebar-feed-ticker">
        <Skeleton className="min-h-[4.5rem] w-full rounded-md" />
      </div>
    );
  }

  if (pool.length === 0) {
    return (
      <div
        className={tickerWrapperClass}
        data-test-id="sidebar-feed-ticker"
        aria-live="polite"
      >
        <div className={tickerContentClass}>
          <p className={`${tickerTextClass} text-text-soft`}>
            Add phrases in Settings → Sidebar Feed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={tickerWrapperClass}
      data-test-id="sidebar-feed-ticker"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={tickerContentClass}>
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.id}
              className="min-w-0 w-full"
              initial={reducedMotion ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -3 }}
              transition={{ duration: reducedMotion ? 0 : 0.22 }}
            >
              <p className={tickerTextClass}>
                {current.content}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
