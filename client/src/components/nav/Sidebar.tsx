import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  PanelsTopLeft,
  Inbox,
  Layers,
  ListChecks,
  ScrollText,
  Search,
  BookMarked,
  Settings as SettingsIcon,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { NavigatorOrb } from '@/components/command/NavigatorOrb';
import { SidebarFeedTicker } from '@/components/nav/SidebarFeedTicker';
import { XpBadge } from '@/components/hud/XpBadge';
import { ThemeToggle } from '@/components/nav/ThemeToggle';
import { usePendingCapturesCount } from '@/hooks/usePendingCaptures';

type Item = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  matchPaths?: Array<string>;
  showDot?: boolean;
};

const MORE_STORAGE_KEY = 'cc:sidebarMoreOpen';

const primaryItems: Array<Item> = [
  { to: '/', label: 'Command Center', icon: LayoutDashboard, end: true },
  { to: '/overview', label: 'Overview', icon: PanelsTopLeft },
  {
    to: '/work',
    label: 'Work',
    icon: ListChecks,
    matchPaths: ['/work', '/tasks', '/goals', '/study', '/mission-map'],
  },
  { to: '/areas', label: 'Areas', icon: Layers },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/search', label: 'Search', icon: Search },
];

const moreItems: Array<Item> = [
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/resources', label: 'Resources', icon: BookMarked },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

const readMoreOpen = (): boolean => {
  try {
    return localStorage.getItem(MORE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const writeMoreOpen = (open: boolean): void => {
  try {
    localStorage.setItem(MORE_STORAGE_KEY, String(open));
  } catch {
    /* ignore */
  }
};

const NavItem = ({ item }: { item: Item }) => {
  const Icon = item.icon;
  const location = useLocation();

  const isActive = (): boolean => {
    if (item.matchPaths) {
      return item.matchPaths.some(
        (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
      );
    }
    if (item.end) return location.pathname === item.to;
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  const active = isActive();

  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-all duration-200',
        'hover:translate-x-0.5 motion-reduce:transform-none',
        active
          ? 'border-cyan bg-cyan/10 text-text-main shadow-glow-cyan motion-safe:animate-pulse-slow'
          : 'border-transparent text-text-soft hover:bg-white/5 hover:text-text-main',
      )}
      data-test-id={`sidebar-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <Icon
        size={16}
        className={cn(
          'transition-colors duration-200',
          active ? 'text-cyan' : 'text-text-soft group-hover:text-cyan',
        )}
      />
      <span className="font-medium">{item.label}</span>
      {item.showDot && (
        <span
          className="ml-auto h-2 w-2 rounded-full bg-neon shadow-[0_0_8px_rgba(0,255,163,0.8)]"
          aria-label="Pending captures"
          data-test-id="inbox-pending-dot"
        />
      )}
    </NavLink>
  );
};

export const Sidebar = () => {
  const location = useLocation();
  const pendingCount = usePendingCapturesCount();
  const moreRouteActive = moreItems.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  );
  const [moreOpen, setMoreOpen] = useState(() => readMoreOpen() || moreRouteActive);

  useEffect(() => {
    if (moreRouteActive) setMoreOpen(true);
  }, [moreRouteActive]);

  const handleToggleMore = () => {
    setMoreOpen((prev) => {
      const next = !prev;
      writeMoreOpen(next);
      return next;
    });
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border-subtle bg-bg-mid/40 backdrop-blur-glass md:flex">
      <div className="flex items-center gap-3 px-5 py-6">
        <NavigatorOrb size={32} />
        <div>
          <div className="text-sm font-semibold tracking-wide text-text-main">Command Center</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">v0.1 mvp</div>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-3" aria-label="Primary">
          {primaryItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}

          <button
            type="button"
            onClick={handleToggleMore}
            aria-expanded={moreOpen}
            className={cn(
              'group relative flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-all duration-200',
              'hover:translate-x-0.5 motion-reduce:transform-none',
              moreRouteActive && !moreOpen
                ? 'border-border-accent-strong text-text-main'
                : 'border-transparent text-text-soft hover:bg-white/5 hover:text-text-main',
            )}
            data-test-id="sidebar-more-toggle"
          >
            <ChevronRight
              size={16}
              className={cn(
                'text-text-soft transition-transform duration-200 group-hover:text-cyan',
                moreOpen && 'rotate-90',
              )}
            />
            <span className="font-medium">More</span>
          </button>

          <AnimatePresence initial={false}>
            {moreOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-1 pb-1 pl-2 pr-3">
                  {moreItems.map((item) => (
                    <NavItem
                      key={item.to}
                      item={{
                        ...item,
                        showDot: item.to === '/inbox' && (pendingCount.data?.count ?? 0) > 0,
                      }}
                    />
                  ))}
                  <div className="mt-2 border-t border-border-subtle pt-2">
                    <ThemeToggle />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        <SidebarFeedTicker />
        <XpBadge />
      </div>

      <div className="border-t border-border-subtle px-5 py-4">
        <div className="text-[11px] leading-relaxed text-text-muted">
          Open the app
          <span className="text-text-soft"> -&gt; </span>
          know what matters now.
        </div>
      </div>
    </aside>
  );
};
