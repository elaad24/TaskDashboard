/** Local calendar day as YYYY-MM-DD (not UTC). */
export const toLocalIsoDay = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const startOfLocalDay = (date: Date = new Date()): Date => {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
};

/** Monday 00:00 local time for the week containing `date`. */
export const startOfWeek = (date: Date = new Date()): Date => {
  const out = startOfLocalDay(date);
  const day = out.getDay();
  const diff = day === 0 ? 6 : day - 1;
  out.setDate(out.getDate() - diff);
  return out;
};

export const daysAgoLocal = (days: number, from: Date = new Date()): Date => {
  const out = startOfLocalDay(from);
  out.setDate(out.getDate() - days);
  return out;
};

export const isSameLocalCalendarDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
