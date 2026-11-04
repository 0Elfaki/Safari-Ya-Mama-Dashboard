import clsx from 'clsx';
import mark from '@/assets/brand/mark.png';

export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={clsx('flex min-w-0 items-center gap-2', className)}>
      <img src={mark} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-md" />
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-body font-extrabold text-ink">Safari ya Mama</p>
          <p className="text-caption leading-snug text-ink-2">Recognize. Prepare. Seek care.</p>
        </div>
      )}
    </div>
  );
}
