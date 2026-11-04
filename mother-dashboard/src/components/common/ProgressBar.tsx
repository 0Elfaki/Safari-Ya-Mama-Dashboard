import clsx from 'clsx';

/** Linear progress with an accessible label. Value 0..1. */
export function ProgressBar({ value, label, showValue, className, tone = 'primary' }: { value: number; label: string; showValue?: boolean; className?: string; tone?: 'primary' | 'success' }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={clsx('min-w-0', className)}>
      {showValue && (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="t-small">{label}</span>
          <span className="t-num text-small font-semibold text-ink">{pct}%</span>
        </div>
      )}
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 w-full overflow-hidden rounded-full bg-primary-soft">
        <div className={clsx('h-full rounded-full transition-[width] duration-500', tone === 'primary' ? 'bg-primary' : 'bg-success')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
