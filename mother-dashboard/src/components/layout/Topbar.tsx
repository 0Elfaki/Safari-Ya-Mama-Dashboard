import { Menu, Siren } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCare } from '@/hooks/useCare';
import { useUi } from '@/store/ui';
import { ButtonLink, IconButton } from '../common/Button';
import { NotificationDropdown } from '../navigation/NotificationDropdown';
import { titleFor } from '../navigation/navItems';
import { Logo } from './Logo';
import { SyncStatus } from './SyncStatus';

export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const initials = name.trim() ? name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() : 'M';
  return (
    <span className={size === 'lg' ? 'inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-h3 font-bold text-ink' : 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-small font-bold text-ink'} aria-hidden>
      {initials}
    </span>
  );
}

/**
 * Sticky top bar. The Emergency button is in it on every screen and every size,
 * so emergency help is always one tap away.
 */
export function Topbar() {
  const { pathname } = useLocation();
  const setDrawer = useUi((s) => s.setDrawer);
  const drawerOpen = useUi((s) => s.drawerOpen);
  const { mother } = useCare();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex h-topbar max-w-content items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <IconButton icon={Menu} label="Open menu" className="-ml-2 md:hidden" aria-expanded={drawerOpen} aria-controls="mobile-drawer" onClick={() => setDrawer(true)} />
        <Link to="/" className="min-w-0 md:hidden" aria-label="Safari ya Mama home">
          <Logo compact />
        </Link>
        <p className="hidden min-w-0 truncate font-display text-h3 font-bold md:block">{titleFor(pathname)}</p>
        <div className="flex-1" />
        <SyncStatus className="hidden xl:inline-flex" />
        <ButtonLink to="/emergency" variant="danger" size="sm" icon={Siren} className="px-3 sm:px-4" aria-label="Emergency help">
          Emergency
        </ButtonLink>
        <NotificationDropdown />
        <Link to="/profile" className="hidden rounded-full focus-visible:ring-2 focus-visible:ring-primary sm:inline-flex" aria-label="My profile">
          <Avatar name={mother?.name ?? ''} />
        </Link>
      </div>
    </header>
  );
}
