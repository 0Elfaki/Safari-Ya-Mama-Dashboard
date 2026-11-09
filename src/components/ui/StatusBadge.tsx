import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Circle, Clock, FlaskConical, Info, Siren, XCircle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { msg, useT } from '@/lib/i18n';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'demo';

const toneClass: Record<BadgeTone, string> = {
  neutral: 'border-line bg-surface-2 text-ink-2',
  primary: 'border-primary/25 bg-primary-soft text-primary',
  success: 'border-success/30 bg-success-soft text-success',
  warning: 'border-warning/30 bg-warning-soft text-warning',
  danger: 'border-danger/30 bg-danger-soft text-danger',
  demo: 'border-accent/50 bg-accent-soft text-ink',
};
const toneIcon: Record<BadgeTone, LucideIcon> = {
  neutral: Circle,
  primary: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: Siren,
  demo: FlaskConical,
};

/** Small status label: always an icon and words, never colour alone. */
export function StatusBadge({ tone = 'neutral', icon, children, className }: { tone?: BadgeTone; icon?: LucideIcon | null; children: ReactNode; className?: string }) {
  const Icon = icon === null ? null : (icon ?? toneIcon[tone]);
  return (
    <span className={clsx('inline-flex max-w-full items-center gap-1 rounded-full border px-3 py-1 text-caption font-semibold leading-none', toneClass[tone], className)}>
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Marks anything derived from illustrative demo records. */
export const DemoBadge = ({ className }: { className?: string }) => {
  const t = useT();
  return (
    <StatusBadge tone="demo" className={className}>
      {t('Demo data')}
    </StatusBadge>
  );
};

export const appointmentStatus: Record<string, { tone: BadgeTone; label: string; icon: LucideIcon }> = {
  scheduled: { tone: 'neutral', label: msg('Scheduled'), icon: Clock },
  confirmed: { tone: 'primary', label: msg('Confirmed'), icon: CheckCircle2 },
  completed: { tone: 'success', label: msg('Completed'), icon: CheckCircle2 },
  missed: { tone: 'warning', label: msg('Missed'), icon: AlertTriangle },
  cancelled: { tone: 'neutral', label: msg('Cancelled'), icon: XCircle },
};
