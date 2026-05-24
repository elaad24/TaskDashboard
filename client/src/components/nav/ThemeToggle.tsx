import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle = () => {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 text-xs transition-colors',
        'text-text-soft hover:bg-white/5 hover:text-text-main',
      )}
      data-test-id="theme-toggle"
    >
      {isDark ? <Sun size={14} className="text-cyan" /> : <Moon size={14} className="text-cyan" />}
      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
};
