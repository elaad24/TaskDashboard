import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { NavigatorOrb } from '@/components/command/NavigatorOrb';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TOUR_STEPS, type TourPlacement } from '@/components/tour/tourSteps';
import { useTour } from '@/components/tour/useTour';
import { useTypewriter } from '@/components/tour/useTypewriter';

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_GAP = 16;
const TOOLTIP_WIDTH = 320;
const MEASURE_RETRY_MS = 120;
const MEASURE_MAX_RETRIES = 8;

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const getHoleRect = (rect: TargetRect): TargetRect => ({
  top: Math.max(0, rect.top - SPOTLIGHT_PADDING),
  left: Math.max(0, rect.left - SPOTLIGHT_PADDING),
  width: rect.width + SPOTLIGHT_PADDING * 2,
  height: rect.height + SPOTLIGHT_PADDING * 2,
});

const getTooltipPosition = (
  hole: TargetRect,
  placement: TourPlacement,
  viewport: { width: number; height: number },
): { top: number; left: number } => {
  const centerX = hole.left + hole.width / 2 - TOOLTIP_WIDTH / 2;
  const centerY = viewport.height / 2 - 120;

  if (placement === 'center') {
    return {
      top: Math.max(16, centerY),
      left: Math.max(16, Math.min(viewport.width - TOOLTIP_WIDTH - 16, (viewport.width - TOOLTIP_WIDTH) / 2)),
    };
  }

  let top = hole.top;
  let left = centerX;

  switch (placement) {
    case 'top':
      top = hole.top - TOOLTIP_GAP - 180;
      left = centerX;
      break;
    case 'bottom':
      top = hole.top + hole.height + TOOLTIP_GAP;
      left = centerX;
      break;
    case 'left':
      top = hole.top + hole.height / 2 - 90;
      left = hole.left - TOOLTIP_WIDTH - TOOLTIP_GAP;
      break;
    case 'right':
      top = hole.top + hole.height / 2 - 90;
      left = hole.left + hole.width + TOOLTIP_GAP;
      break;
    default:
      break;
  }

  return {
    top: Math.max(16, Math.min(top, viewport.height - 200)),
    left: Math.max(16, Math.min(left, viewport.width - TOOLTIP_WIDTH - 16)),
  };
};

type TourTooltipBodyProps = {
  text: string;
  enabled: boolean;
};

const TourTooltipBody = ({ text, enabled }: TourTooltipBodyProps) => {
  const { displayed, isDone, skip } = useTypewriter(text, { enabled });

  return (
    <p
      className="mt-3 min-h-[64px] cursor-default text-sm leading-relaxed text-text-soft"
      onClick={isDone ? undefined : skip}
      title={isDone ? undefined : 'Click to reveal'}
    >
      {displayed}
      {!isDone && (
        <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-cyan align-middle" />
      )}
    </p>
  );
};

export const TourOverlay = () => {
  const { isRunning, stepIndex, totalSteps, next, back, stop } = useTour();
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  const step = TOUR_STEPS[stepIndex];
  const isCentered = !step?.target || targetMissing || !targetRect;
  const isLastStep = stepIndex >= totalSteps - 1;
  const isFirstStep = stepIndex <= 0;

  const measureTarget = useCallback((): boolean => {
    if (!step?.target) {
      setTargetRect(null);
      setTargetMissing(false);
      return true;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      setTargetRect(null);
      setTargetMissing(true);
      return false;
    }

    el.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setTargetRect(null);
      setTargetMissing(true);
      return false;
    }

    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
    setTargetMissing(false);
    return true;
  }, [step, reduceMotion]);

  useEffect(() => {
    if (!isRunning) return;

    let cancelled = false;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const attemptMeasure = (): void => {
      if (cancelled) return;
      const found = measureTarget();
      if (!found && retries < MEASURE_MAX_RETRIES) {
        retries += 1;
        timer = setTimeout(attemptMeasure, MEASURE_RETRY_MS);
      }
    };

    timer = setTimeout(attemptMeasure, MEASURE_RETRY_MS);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isRunning, stepIndex, measureTarget]);

  useEffect(() => {
    if (!isRunning) return;

    const updateViewport = (): void => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      measureTarget();
    };

    window.addEventListener('resize', updateViewport);
    window.addEventListener('scroll', updateViewport, true);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('scroll', updateViewport, true);
    };
  }, [isRunning, measureTarget]);

  useEffect(() => {
    if (!isRunning) return;
    const focusTimer = setTimeout(() => {
      dialogRef.current?.focus();
    }, 80);
    return () => clearTimeout(focusTimer);
  }, [isRunning, stepIndex]);

  if (!isRunning || !step) return null;

  const hole = targetRect ? getHoleRect(targetRect) : null;
  const tooltipPos = getTooltipPosition(
    hole ?? { top: viewport.height / 2, left: viewport.width / 2, width: 0, height: 0 },
    isCentered ? 'center' : step.placement,
    viewport,
  );

  const overlay = (
    <AnimatePresence>
      {isRunning && (
        <motion.div
          key="tour-overlay"
          initial={{ opacity: reduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: reduceMotion ? 1 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="fixed inset-0 z-[100]"
          data-test-id="tour-overlay"
        >
          {hole && !isCentered ? (
            <>
              <div
                className="absolute left-0 right-0 top-0 bg-black/70"
                style={{ height: hole.top }}
                aria-hidden
              />
              <div
                className="absolute left-0 bg-black/70"
                style={{ top: hole.top, width: hole.left, height: hole.height }}
                aria-hidden
              />
              <div
                className="absolute bg-black/70"
                style={{
                  top: hole.top,
                  left: hole.left + hole.width,
                  right: 0,
                  height: hole.height,
                }}
                aria-hidden
              />
              <div
                className="absolute bottom-0 left-0 right-0 bg-black/70"
                style={{ top: hole.top + hole.height }}
                aria-hidden
              />
              <motion.div
                className="pointer-events-none absolute rounded-lg border-2 border-cyan shadow-[0_0_24px_rgba(34,211,238,0.45)]"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
                style={{
                  top: hole.top,
                  left: hole.left,
                  width: hole.width,
                  height: hole.height,
                }}
                aria-hidden
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-black/70" aria-hidden />
          )}

          <motion.div
            className="fixed z-[101]"
            style={{ width: TOOLTIP_WIDTH }}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              top: tooltipPos.top,
              left: tooltipPos.left,
            }}
            transition={{ type: reduceMotion ? 'tween' : 'spring', stiffness: 320, damping: 28 }}
          >
            <GlassCard
              ref={dialogRef}
              variant="cyan"
              glow
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={`Tour step ${stepIndex + 1} of ${totalSteps}: ${step.title}`}
              className="p-4 outline-none"
              data-test-id="tour-tooltip"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="shrink-0"
                >
                  <NavigatorOrb size={36} state="speaking" />
                </motion.div>
                <div className="min-w-0">
                  <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
                    Navigator · {stepIndex + 1}/{totalSteps}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.h2
                      key={stepIndex}
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="truncate text-base font-semibold text-text-main"
                    >
                      {step.title}
                    </motion.h2>
                  </AnimatePresence>
                </div>
              </div>

              <TourTooltipBody key={stepIndex} text={step.body} enabled={!reduceMotion} />

              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-cyan shadow-glow-cyan"
                  initial={false}
                  animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                  transition={{ duration: reduceMotion ? 0 : 0.4, ease: 'easeOut' }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={stop}
                  className="text-xs text-text-muted transition-colors hover:text-text-main"
                  data-test-id="tour-skip"
                >
                  Skip tour
                </button>
                <div className="flex items-center gap-2">
                  <GlowButton
                    variant="ghost"
                    size="sm"
                    onClick={back}
                    disabled={isFirstStep}
                    leftIcon={<ChevronLeft size={14} />}
                    data-test-id="tour-back"
                  >
                    Back
                  </GlowButton>
                  <GlowButton
                    size="sm"
                    onClick={next}
                    rightIcon={!isLastStep ? <ChevronRight size={14} /> : undefined}
                    data-test-id="tour-next"
                  >
                    {isLastStep ? 'Finish' : 'Next'}
                  </GlowButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
};
