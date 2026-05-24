import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export const useReducedMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const handleChange = () => setReduceMotion(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return reduceMotion;
};
