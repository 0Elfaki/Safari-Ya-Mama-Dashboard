import clsx from 'clsx';
import { Building2, Globe, LogOut, Menu, ShieldCheck, WifiOff, X } from 'lucide-react';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { navFor, titleFor } from '@/app/nav';
import logo from '@/assets/brand/logo.png';
import { facilities } from '@/lib/api';
import { reviewQueue } from '@/lib/care';
import { roleLabel } from '@/lib/format';
import { useLang, useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';
import { useOnline } from '@/lib/useOnline';
import { useSession } from '@/lib/session';
import { IconButton } from '../ui/Button';
import { LoadingState } from '../ui/StateViews';
import { useToast } from '../ui/Bits';
import { LanguageSwitch } from '../LanguageSwitch';

/** Posts waiting in the Mothers' circle review queue (checked every 2 minutes). */
function useCircleWaiting(on: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    let stop = false;
    const load = () => reviewQueue().then((q) => { if (!stop) setN(q.length); }).catch(() => undefined);
    load();
    const t = window.setInterval(load, 120_000);
    return () => { stop = true; window.clearInterval(t); };
  }, [on]);
  return n;
}

export function Logo({ sub }: { sub?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <img src={logo} alt="" className="h-10 w-10 shrink-0 rounded-md" width={40} height={40} />
      <span className="min-w-0">
        <span className="block truncate font-display text-body font-extrabold text-ink">Safari ya Mama</span>
        {sub && <span className="t-caption block truncate">{sub}</span>}
      </span>
    </span>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { role, kind } = useSession();
  const items = navFor(role, kind);
  const waiting = useCircleWaiting(items.some((i) => i.to === '/circle'));
  const groups = [...new Set(items.map((i) => i.group))];
  const t = useT();
  return (
    <nav aria-label={t('Dashboard')} className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g}>
          <p className="t-label mb-2 px-3">{t(g)}</p>
          <ul className="flex flex-col gap-1">
            {items.filter((i) => i.group === g).map((i) => (
              <li key={i.to}>
                <NavLink to={i.to} onClick={onNavigate}
                  className={({ isActive }) => clsx('flex min-h-11 items-center gap-3 rounded-md px-3 text-small font-semibold transition-colors',
                    isActive ? 'bg-primary text-white' : 'text-ink hover:bg-primary-soft hover:text-primary')}>
                  <i.icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="min-w-0 py-2 leading-tight">{t(i.label)}</span>
                  {i.to === '/circle' && waiting > 0 && <span className="t-num ml-auto rounded-full bg-danger px-2 text-caption font-bold text-white" aria-label={t('{n} waiting', { n: waiting })}>{waiting > 99 ? '99+' : waiting}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Where you are working. Staff: their facilities. Super admins and Admins: Administration or any facility. */
function WorkspaceSwitch() {
  const s = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const t = useT();
  const all = useAsync(() => (s.isAdmin ? facilities() : Promise.resolve([])), [s.isAdmin]);
  if (s.isWebTeam)
    return <span className="flex min-w-0 items-center gap-2 text-small font-semibold text-ink"><Globe className="h-5 w-5 shrink-0 text-primary" aria-hidden /><span className="truncate">{t('Website team')}</span></span>;
  const options = s.isAdmin ? (all.data ?? []).filter((f) => f.active).map((f) => ({ id: f.id, name: f.name })) : s.facilities;
  const value = s.kind === 'admin' ? 'admin' : s.facility?.id ?? '';
  if (!s.isAdmin && options.length < 2)
    return (
      <span className="flex min-w-0 items-center gap-2 text-small font-semibold text-ink">
        <Building2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <span className="truncate">{s.facility?.name}</span>
      </span>
    );
  const Icon = s.kind === 'admin' ? ShieldCheck : Building2;
  return (
    <label className="flex min-w-0 items-center gap-2 text-small font-semibold text-ink">
      <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      <select value={value} disabled={busy} aria-label={t('Working in')}
        onChange={async (e) => {
          setBusy(true);
          try {
            if (e.target.value === 'admin') { await s.openAdministration(); toast(t('Back in Administration')); }
            else { await s.openFacility(e.target.value); toast(t('You are now working at this facility')); }
          } catch (err) { toast((err as Error).message, 'bad'); }
          setBusy(false);
        }}
        className="min-h-11 min-w-0 max-w-64 truncate rounded-md border border-line bg-surface px-3 text-small font-semibold">
        {s.isAdmin && <option value="admin">{t('Administration · all facilities')}</option>}
        {s.isAdmin && options.length > 0 && <option disabled>──────────</option>}
        {options.map((f) => <option key={f.id} value={f.id}>{s.isAdmin ? t('Work at {name}', { name: f.name }) : f.name}</option>)}
      </select>
    </label>
  );
}

export function Shell() {
  const s = useSession();
  const online = useOnline();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);
  const { t, lang } = useLang();
  useEffect(() => setDrawer(false), [loc.pathname]);
  useEffect(() => {
    const title = titleFor(loc.pathname);
    document.title = title ? `${t(title)} · Safari ya Mama` : t('Safari ya Mama · Dashboard');
  }, [loc.pathname, lang, t]);
  const sub = s.isWebTeam ? t('Website') : s.kind === 'admin' ? t('Administration') : t('Medical staff');

  return (
    <div className="min-h-dvh lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-3">{t('Skip to content')}</a>
      <aside className="sticky top-0 hidden h-dvh print:!hidden w-sidebar shrink-0 flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-4 py-5 lg:flex">
        <Logo sub={sub} />
        <NavList />
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-sidebar max-w-full flex-col gap-6 overflow-y-auto bg-surface px-4 py-5 shadow-raised" aria-label={t('Menu')}>
            <div className="flex items-center justify-between gap-2">
              <Logo sub={sub} />
              <IconButton icon={X} label={t('Close menu')} onClick={() => setDrawer(false)} />
            </div>
            <NavList onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex print:hidden min-h-topbar items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
          <IconButton icon={Menu} label={t('Open menu')} onClick={() => setDrawer(true)} className="-ml-2 lg:hidden" />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <WorkspaceSwitch />
          </div>
          <LanguageSwitch compact />
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-small font-semibold text-ink">{s.name}</p>
            <p className="t-caption truncate">{s.role ? t(roleLabel[s.role]) : ''}</p>
          </div>
          <IconButton icon={LogOut} label={t('Sign out')} variant="outline" onClick={() => s.signOut(t('You are signed out.'))} />
        </header>
        {!online && (
          <div role="status" className="flex items-center gap-2 border-b border-warning/30 bg-warning-soft px-4 py-2 text-small font-semibold text-ink sm:px-6">
            <WifiOff className="h-4 w-4 shrink-0 text-warning" aria-hidden /> {t('You are offline. Figures shown may be out of date and changes cannot be saved.')}
          </div>
        )}
        <main id="main" className="mx-auto w-full min-w-0 max-w-content flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <Suspense fallback={<LoadingState text={t('Opening page…')} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="t-h1">{title}</h1>
        {subtitle && <p className="t-small mt-1 max-w-prose">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
