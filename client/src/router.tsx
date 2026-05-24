import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/layouts/AppShell';
import { CommandCenterPage } from '@/pages/CommandCenterPage';
import { InboxPage } from '@/pages/InboxPage';
import { AreasPage } from '@/pages/AreasPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { TasksPage } from '@/pages/TasksPage';
import { StudyPage } from '@/pages/StudyPage';
import { LogsPage } from '@/pages/LogsPage';
import { SearchPage } from '@/pages/SearchPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { ResourcesPage } from '@/pages/ResourcesPage';
import { WorkRedirect } from '@/pages/WorkRedirect';
import { MissionMapPage } from '@/pages/MissionMapPage';

const routes: Array<RouteObject> = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <CommandCenterPage /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'work', element: <WorkRedirect /> },
      { path: 'inbox', element: <InboxPage /> },
      { path: 'areas', element: <AreasPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'goals/:id', element: <GoalsPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'mission-map', element: <MissionMapPage /> },
      { path: 'study', element: <StudyPage /> },
      { path: 'logs', element: <LogsPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'resources', element: <ResourcesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
