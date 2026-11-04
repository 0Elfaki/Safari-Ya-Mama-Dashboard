import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { usePrefs } from '@/store/prefs';
import { useUi } from '@/store/ui';
import { IconButton } from '../common/Button';
import { navItems } from '../navigation/navItems';
import { Logo } from './Logo';

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {navItems.map(({ to, label, icon: Icon, tone }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            className={({ isActive }) =>
              clsx(
                'group flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-small font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary',
                collapsed && 'justify-center px-0',
                isActive ? 'bg-primary text-white' : tone === 'danger' ? 'text-danger hover:bg-danger-soft' : 'text-ink hover:bg-primary-soft hover:text-primary',
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** True when the sidebar shows labels: desktop unless collapsed; tablet while expanded. */
export function useSidebarWide() {
  const desktop = useIsDesktop();
  const collapsed = usePrefs((s) => s.sidebarCollapsed);
  const railExpanded = useUi((s) => s.railExpanded);
  return { desktop, wide: desktop ? !collapsed : railExpanded, collapsed };
}

/**
 * Desktop (≥1024): fixed full sidebar; collapsing to an icon rail is remembered.
 * Tablet (768–1023): icon rail that expands over the content.
 * Phones use the drawer below instead.
 */
export function Sidebar() {
  const { desktop, wide, collapsed } = useSidebarWide();
  const set = usePrefs((s) => s.set);
  const setRail = useUi((s) => s.setRailExpanded);
  const { pathname } = useLocation();
  useEffect(() => setRail(false), [pathname, setRail]);

  const toggle = () => (desktop ? set({ sidebarCollapsed: !collapsed }) : setRail(!wide));

  return (
    <>
      {!desktop && wide && <div className="fixed inset-0 z-30 hidden bg-ink/30 md:block" onClick={() => setRail(false)} aria-hidden />}
      <aside
        className={clsx('fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden whitespace-nowrap border-r border-line bg-surface transition-[width] duration-200 md:flex', wide ? 'w-sidebar' : 'w-rail', !desktop && wide && 'shadow-raised')}
        aria-label="Main navigation"
      >
        <div className={clsx('flex h-topbar shrink-0 items-center border-b border-line', wide ? 'px-4' : 'justify-center px-2')}>
          <Logo compact={!wide} />
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-3">
          <NavList collapsed={!wide} />
        </nav>
        <div className={clsx('flex shrink-0 border-t border-line p-3', wide ? 'justify-end' : 'justify-center')}>
          <IconButton icon={wide ? PanelLeftClose : PanelLeftOpen} label={wide ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={wide} onClick={toggle} />
        </div>
      </aside>
    </>
  );
}

/** Phones: full navigation in a drawer opened from the top bar. */
export function MobileDrawer() {
  const open = useUi((s) => s.drawerOpen);
  const setDrawer = useUi((s) => s.setDrawer);
  const { pathname } = useLocation();
  useEffect(() => setDrawer(false), [pathname, setDrawer]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setDrawer]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.div className="absolute inset-0 bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} aria-hidden />
          <motion.nav
            id="mobile-drawer"
            aria-label="Main navigation"
            className="absolute inset-y-0 left-0 flex w-64 max-w-full flex-col bg-surface shadow-raised"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex h-topbar shrink-0 items-center justify-between gap-2 border-b border-line pl-4 pr-2">
              <Logo />
              <IconButton icon={X} label="Close menu" onClick={() => setDrawer(false)} autoFocus />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <NavList onNavigate={() => setDrawer(false)} />
            </div>
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  );
}
