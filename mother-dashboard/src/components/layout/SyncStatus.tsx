import clsx from 'clsx';
import { CloudOff, Smartphone } from 'lucide-react';
import { useOnline } from '@/hooks/useOnline';

/**
 * Genuine sync status. This prototype has no clinic account connection, so records are
 * saved on this device only; it says so, and says when the browser is offline.
 */
export function SyncStatus({ className, compact }: { className?: string; compact?: boolean }) {
  const online = useOnline();
  const Icon = online ? Smartphone : CloudOff;
  const text = online ? 'Saved on this device' : 'Offline · saved on this device';
  return (
    <span
      role="status"
      title="Your records are stored in this browser only. They are not sent to a clinic."
      className={clsx('inline-flex min-w-0 items-center gap-2 text-caption font-semibold', online ? 'text-ink-2' : 'text-warning', className)}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className={clsx('truncate', compact && 'sr-only')}>{text}</span>
    </span>
  );
}
