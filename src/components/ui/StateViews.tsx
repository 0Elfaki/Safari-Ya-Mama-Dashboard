import clsx from 'clsx';
import { AlertCircle, Loader2, RefreshCw, WifiOff, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { Button } from './Button';

/** EmptyState: what is missing and, optionally, how to fill it. */
export function EmptyState({ icon: Icon, title, text, action, compact, className }: { icon: LucideIcon; title: string; text?: ReactNode; action?: ReactNode; compact?: boolean; className?: string }) {
  return (
    <div className={clsx('flex flex-col items-center text-center', compact ? 'gap-2 py-4' : 'gap-3 px-4 py-8', className)}>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-2" aria-hidden>
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="t-small max-w-prose">{text}</p>}
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** LoadingState: a spinner with words (never a bare spinner), or a skeleton block. */
export function LoadingState({ text, className }: { text?: string; className?: string }) {
  const t = useT();
  return (
    <div role="status" className={clsx('flex items-center justify-center gap-3 py-8 text-ink-2', className)}>
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      <span className="text-small">{text ?? t('Loading…')}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-md bg-surface-2', className)} aria-hidden />;
}

/** ErrorState: what went wrong in plain words, and a retry when one makes sense. */
export function ErrorState({ title, text, onRetry, className }: { title?: string; text: ReactNode; onRetry?: () => void; className?: string }) {
  const t = useT();
  return (
    <div role="alert" className={clsx('rounded-lg border border-danger/30 bg-danger-soft p-5', className)}>
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{title ?? t('Something went wrong')}</p>
          <p className="t-small mt-1 text-ink">{text}</p>
          {onRetry && (
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRetry} className="mt-3">
              {t('Try again')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function OfflineNotice({ className }: { className?: string }) {
  const t = useT();
  return (
    <div role="status" className={clsx('flex items-start gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-3', className)}>
      <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
      <p className="text-small text-ink">
        <span className="font-semibold">{t('You are offline.')}</span> {t('Everything on this page still works and is saved on this device.')}
      </p>
    </div>
  );
}
