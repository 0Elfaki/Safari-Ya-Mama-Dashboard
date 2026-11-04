import { Compass } from 'lucide-react';
import type React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ButtonLink } from '@/components/common/Button';
import { BaseCard } from '@/components/common/Card';
import { EmptyState } from '@/components/common/StateViews';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { EmergencyPage } from '@/features/emergency/EmergencyPage';

function NotFound() {
  return (
    <BaseCard>
      <EmptyState icon={Compass} title="Page not found" text="The page you were looking for does not exist." action={<ButtonLink to="/">Go to Home</ButtonLink>} />
    </BaseCard>
  );
}

/** Route-level code splitting. Home and Emergency stay in the main bundle so they open instantly. */
const page =
  <M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M) =>
  async () => ({ Component: (await load())[name] as React.ComponentType });

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/care', lazy: page(() => import('@/features/maternal/MyCarePage'), 'MyCarePage') },
      { path: '/pregnancy', lazy: page(() => import('@/features/pregnancy/PregnancyPage'), 'PregnancyPage') },
      { path: '/baby', lazy: page(() => import('@/features/baby/BabyPage'), 'BabyPage') },
      { path: '/mamabot', lazy: page(() => import('@/features/mamabot/MamaBotPage'), 'MamaBotPage') },
      { path: '/library', lazy: page(() => import('@/features/education/LibraryPage'), 'LibraryPage') },
      { path: '/library/:id', lazy: page(() => import('@/features/education/LessonPage'), 'LessonPage') },
      { path: '/appointments', lazy: page(() => import('@/features/appointments/AppointmentsPage'), 'AppointmentsPage') },
      { path: '/appointments/:id', lazy: page(() => import('@/features/appointments/AppointmentsPage'), 'AppointmentsPage') },
      { path: '/emergency', element: <EmergencyPage /> },
      { path: '/profile', lazy: page(() => import('@/features/profile/ProfilePage'), 'ProfilePage') },
      { path: '/settings', lazy: page(() => import('@/features/settings/SettingsPage'), 'SettingsPage') },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
