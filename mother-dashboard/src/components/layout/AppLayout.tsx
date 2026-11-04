import clsx from 'clsx';
import { MotionConfig } from 'framer-motion';
import { FlaskConical } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigation } from 'react-router-dom';
import { useOnline } from '@/hooks/useOnline';
import { usePrefs } from '@/store/prefs';
import { useRecords } from '@/store/records';
import { OfflineNotice } from '../common/StateViews';
import { MobileNavigation } from '../navigation/MobileNavigation';
import { MobileDrawer, Sidebar, useSidebarWide } from './Sidebar';
import { Topbar } from './Topbar';

/** Persistent label while demo records are loaded, so they are never mistaken for real data. */
function DemoBanner() {
  const scenario = useRecords((s) => s.scenario);
  if (!scenario) return null;
  return (
    <div className="border-b border-accent/40 bg-accent-soft">
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 sm:px-6 lg:px-8">
        <FlaskConical className="h-4 w-4 shrink-0 text-ink" aria-hidden />
        <p className="min-w-0 flex-1 text-small text-ink">
          <span className="font-semibold">Demo mode.</span> Names, dates and records are illustrative and describe no real person.
        </p>
        <Link to="/settings#demo" className="text-small font-semibold text-primary underline-offset-2 hover:underline">
          Change
        </Link>
      </div>
    </div>
  );
}

/** Scrolls to #hash targets after navigation, or to the top on a new page. */
function useScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const t = window.setTimeout(() => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.focus({ preventScroll: true });
      }
    }, 60);
    return () => window.clearTimeout(t);
  }, [pathname, hash]);
}

/** Thin bar while a page's code is loading, so a tap always shows a response. */
function RouteProgress() {
  const busy = useNavigation().state !== 'idle';
  return (
    <div role="progressbar" aria-label="Loading page" aria-hidden={!busy} className={clsx('fixed inset-x-0 top-0 z-50 h-1 overflow-hidden transition-opacity', busy ? 'opacity-100' : 'opacity-0')}>
      <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
    </div>
  );
}

export function AppLayout() {
  const { desktop, collapsed } = useSidebarWide();
  const textSize = usePrefs((s) => s.textSize);
  const reduceMotion = usePrefs((s) => s.reduceMotion);
  const online = useOnline();
  useScrollToHash();

  useEffect(() => {
    document.documentElement.dataset.text = textSize;
    document.documentElement.dataset.motion = reduceMotion ? 'reduce' : 'auto';
  }, [textSize, reduceMotion]);

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-white">
        Skip to content
      </a>
      <RouteProgress />
      <Sidebar />
      <MobileDrawer />
      <div className={clsx('min-h-dvh pb-bottomnav md:pb-0 md:pl-rail', desktop && !collapsed && 'lg:pl-sidebar')}>
        <Topbar />
        <DemoBanner />
        <main id="main" tabIndex={-1} className="mx-auto max-w-content px-4 pb-10 pt-6 outline-none sm:px-6 lg:px-8 lg:pt-8">
          {!online && <OfflineNotice className="mb-6" />}
          <Outlet />
        </main>
      </div>
      <MobileNavigation />
    </MotionConfig>
  );
}
