import clsx from 'clsx';
import { NavLink } from 'react-router-dom';
import { navItems } from './navItems';

/** Phone bottom bar: the five everyday destinations. Everything else is in the menu drawer. */
export function MobileNavigation() {
  const items = navItems.filter((n) => n.mobile);
  return (
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto grid h-bottomnav max-w-prose grid-cols-5">
        {items.map(({ to, mobile, icon: Icon }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx('flex h-full flex-col items-center justify-center gap-1 px-1 text-caption font-semibold focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary', isActive ? 'text-primary' : 'text-ink-2')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={clsx('inline-flex h-8 w-14 items-center justify-center rounded-full transition-colors', isActive && 'bg-primary-soft')}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="max-w-full truncate">{mobile}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
