import type { ReactNode } from 'react';

type PageScrollProps = {
  children: ReactNode;
};

/** Fills the app main area and scrolls page content (Command Center uses its own inner scroll). */
export const PageScroll = ({ children }: PageScrollProps) => (
  <div className="h-full min-h-0 overflow-y-auto overscroll-contain">{children}</div>
);
