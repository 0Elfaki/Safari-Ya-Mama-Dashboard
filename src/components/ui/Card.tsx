import clsx from 'clsx';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** BaseCard: white, 1 px border, radius 16, subtle shadow, padding 20 (24 on wide screens). */
export function BaseCard({
  children,
  className,
  padded = true,
  as: Tag = 'section',
  ...rest
}: { children: ReactNode; className?: string; padded?: boolean; as?: 'section' | 'div' | 'article' | 'li' } & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={clsx('min-w-0 rounded-lg border border-line bg-surface shadow-card', padded && 'p-5 sm:p-6', className)} {...rest}>
      {children}
    </Tag>
  );
}

/** Card heading row: icon tile, title, optional subtitle and action. */
export function CardHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  badge,
  tone = 'primary',
  headingLevel = 2,
  id,
}: {
  /** Shown under the title (e.g. Demo data) so it never squeezes the heading. */
  badge?: ReactNode;
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  tone?: 'primary' | 'accent' | 'danger' | 'warning';
  headingLevel?: 2 | 3;
  id?: string;
}) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="mb-4 flex items-start gap-3">
      {Icon && (
        <span
          className={clsx(
            'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
            tone === 'primary' && 'bg-primary-soft text-primary',
            tone === 'accent' && 'bg-accent-soft text-ink',
            tone === 'danger' && 'bg-danger-soft text-danger',
            tone === 'warning' && 'bg-warning-soft text-warning',
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <H id={id} className="t-h3">
          {title}
        </H>
        {subtitle && <p className="t-small mt-0.5">{subtitle}</p>}
        {badge && <div className="mt-2">{badge}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** HealthCard: a card with a status band, for health results, alerts and reminders. */
export function HealthCard({
  tone,
  children,
  className,
}: {
  tone: 'success' | 'warning' | 'danger' | 'primary';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'relative min-w-0 overflow-hidden rounded-lg border p-4 pl-6',
        tone === 'success' && 'border-success/30 bg-success-soft',
        tone === 'warning' && 'border-warning/30 bg-warning-soft',
        tone === 'danger' && 'border-danger/30 bg-danger-soft',
        tone === 'primary' && 'border-primary/20 bg-primary-soft',
        className,
      )}
    >
      <span
        className={clsx(
          'absolute inset-y-0 left-0 w-1',
          tone === 'success' && 'bg-success',
          tone === 'warning' && 'bg-warning',
          tone === 'danger' && 'bg-danger',
          tone === 'primary' && 'bg-primary',
        )}
        aria-hidden
      />
      {children}
    </div>
  );
}

/** A row that links somewhere inside a card (shortcut lists). */
export function LinkRow({ to, icon: Icon, title, detail, trailing }: { to: string; icon: LucideIcon; title: string; detail?: ReactNode; trailing?: ReactNode }) {
  return (
    <Link
      to={to}
      className="group flex min-h-14 items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary" aria-hidden>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink">{title}</span>
        {detail && <span className="t-small block truncate">{detail}</span>}
      </span>
      {trailing}
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-2 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
