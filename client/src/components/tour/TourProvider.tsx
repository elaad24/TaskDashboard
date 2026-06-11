import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOUR_STEPS, TOUR_STORAGE_KEY } from '@/components/tour/tourSteps';
import { TourContext, type TourContextValue } from '@/components/tour/useTour';

const writeTourSeen = (): void => {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  } catch {
    /* ignore */
  }
};

type TourProviderProps = {
  children: ReactNode;
};

export const TourProvider = ({ children }: TourProviderProps) => {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const stop = useCallback(() => {
    setIsRunning(false);
    setStepIndex(0);
    writeTourSeen();
  }, []);

  const start = useCallback(() => {
    setStepIndex(0);
    setIsRunning(true);
    const firstRoute = TOUR_STEPS[0]?.route;
    if (firstRoute) navigate(firstRoute);
  }, [navigate]);

  const next = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      stop();
      return;
    }
    setStepIndex((prev) => prev + 1);
  }, [stepIndex, stop]);

  const back = useCallback(() => {
    if (stepIndex <= 0) return;
    setStepIndex((prev) => prev - 1);
  }, [stepIndex]);

  useEffect(() => {
    if (!isRunning) return;
    const step = TOUR_STEPS[stepIndex];
    if (step?.route) navigate(step.route);
  }, [isRunning, stepIndex, navigate]);

  useEffect(() => {
    if (!isRunning) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') stop();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, stop]);

  const value = useMemo<TourContextValue>(
    () => ({
      isRunning,
      stepIndex,
      totalSteps: TOUR_STEPS.length,
      start,
      stop,
      next,
      back,
    }),
    [isRunning, stepIndex, start, stop, next, back],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};
