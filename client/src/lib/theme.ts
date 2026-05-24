export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'cc:theme';

export const readTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return 'dark';
};

export const writeTheme = (theme: Theme): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
};

export const applyTheme = (theme: Theme): void => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#F4F7FB' : '#05070D');
  }
};

export const toggleTheme = (current: Theme): Theme => (current === 'dark' ? 'light' : 'dark');
