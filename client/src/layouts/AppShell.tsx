import { Outlet } from 'react-router-dom';
import { AiStatusBanner } from '@/components/AiStatusBanner';
import { Sidebar } from '@/components/nav/Sidebar';
import { TopCommandBar } from '@/components/command/TopCommandBar';

export const AppShell = () => (
  <div className="flex h-screen overflow-hidden">
    <Sidebar />
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <AiStatusBanner />
      <TopCommandBar />
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 md:px-8">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  </div>
);
