import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { titleFor } from '@/components/navigation/navItems';
import { router } from './router';

export function App() {
  // Keep the document title in step with the page for screen readers and browser tabs.
  useEffect(
    () =>
      router.subscribe((s) => {
        document.title = `${titleFor(s.location.pathname)} · Safari ya Mama`;
      }),
    [],
  );
  useEffect(() => {
    document.title = `${titleFor(window.location.pathname)} · Safari ya Mama`;
  }, []);
  return <RouterProvider router={router} />;
}
