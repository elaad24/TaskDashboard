import { createContext, useContext } from 'react';

export type TourContextValue = {
  isRunning: boolean;
  stepIndex: number;
  totalSteps: number;
  start: () => void;
  stop: () => void;
  next: () => void;
  back: () => void;
};

export const TourContext = createContext<TourContextValue | null>(null);

export const useTour = (): TourContextValue => {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour must be used within TourProvider');
  }
  return ctx;
};
