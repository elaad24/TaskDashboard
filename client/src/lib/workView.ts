export type WorkView = 'tasks' | 'goals' | 'study' | 'mission-map';

const STORAGE_KEY = 'cc:workActiveView';

export const workViewToPath: Record<WorkView, string> = {
  tasks: '/tasks',
  goals: '/goals',
  study: '/study',
  'mission-map': '/mission-map',
};

const isWorkView = (value: string): value is WorkView =>
  value === 'tasks' || value === 'goals' || value === 'study' || value === 'mission-map';

export const getLastWorkView = (): WorkView => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isWorkView(stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'tasks';
};

export const setLastWorkView = (view: WorkView): void => {
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    /* ignore */
  }
};

export const getWorkViewFromPath = (pathname: string): WorkView | null => {
  if (pathname === '/tasks' || pathname.startsWith('/tasks/')) return 'tasks';
  if (pathname === '/goals' || pathname.startsWith('/goals/')) return 'goals';
  if (pathname === '/study' || pathname.startsWith('/study/')) return 'study';
  if (pathname === '/mission-map' || pathname.startsWith('/mission-map/')) return 'mission-map';
  return null;
};

export const isWorkRoute = (pathname: string): boolean => getWorkViewFromPath(pathname) !== null;
