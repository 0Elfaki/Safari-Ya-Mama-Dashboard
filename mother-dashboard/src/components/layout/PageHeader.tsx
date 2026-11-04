import type { ReactNode } from 'react';

/** Page heading block: H1 title, supporting line and optional actions. */
export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="t-h1 sm:text-display">{title}</h1>
        {subtitle && <p className="t-body mt-2 max-w-prose text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

/** Section heading inside a page, with an anchor id for deep links. */
export function SectionHeader({ id, title, subtitle, action }: { id?: string; title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div id={id} tabIndex={id ? -1 : undefined} className="mb-4 flex scroll-mt-24 items-end justify-between gap-4 outline-none">
      <div className="min-w-0">
        <h2 className="t-h2">{title}</h2>
        {subtitle && <p className="t-small mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
