import clsx from 'clsx';
import { AlertCircle, Search, X } from 'lucide-react';
import { cloneElement, forwardRef, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { useT } from '@/lib/i18n';

const control =
  'block w-full min-h-12 rounded-md border bg-surface px-4 py-3 text-body text-ink placeholder:text-ink-2/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-surface-2';
const controlState = (invalid?: boolean) => (invalid ? 'border-danger focus:border-danger' : 'border-line focus:border-primary');

/**
 * FormField: the label always shown above the control (never only a placeholder), optional
 * hint, and an inline error announced to screen readers.
 */
export function FormField({ label, hint, error, required, children, className }: { label: string; hint?: ReactNode; error?: string; required?: boolean; children: ReactElement; className?: string }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [hintId, errId].filter(Boolean).join(' ') || undefined,
        'aria-required': required || undefined,
      })
    : children;
  return (
    <div className={clsx('min-w-0', className)}>
      <label htmlFor={id} className="mb-2 block text-small font-semibold text-ink">
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {child}
      {hint && !error && (
        <p id={hintId} className="t-caption mt-1">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="mt-1 flex items-center gap-1 text-caption font-semibold text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...p }, ref) {
  return <input ref={ref} className={clsx(control, controlState(!!p['aria-invalid']), className)} {...p} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...p }, ref) {
  return <textarea ref={ref} rows={3} className={clsx(control, 'resize-y', controlState(!!p['aria-invalid']), className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return (
    <select ref={ref} className={clsx(control, 'appearance-none bg-surface pr-10', controlState(!!p['aria-invalid']), className)} {...p}>
      {children}
    </select>
  );
});

/** Search box with a clear button. */
export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const t = useT();
  return (
    <div className="relative min-w-0">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" aria-hidden />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} className={clsx(control, controlState(), 'pl-12 pr-12 [&::-webkit-search-cancel-button]:hidden')} />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label={t('Clear search')} className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-ink-2 hover:text-ink">
          <X className="h-5 w-5" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Accessible on/off switch with a visible label and description. */
export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer font-semibold text-ink">
          {label}
        </label>
        {description && <p className="t-small mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="group -my-2 -mr-2 inline-flex h-11 w-16 shrink-0 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className={clsx('relative inline-flex h-7 w-12 items-center rounded-full transition-colors', checked ? 'bg-primary' : 'bg-line')} aria-hidden>
          <span className={clsx('inline-block h-5 w-5 rounded-full bg-surface shadow-card transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
        </span>
      </button>
    </div>
  );
}

/** Selectable chip (multi-select lists such as symptoms). */
export function Chip({ selected, onClick, children, tone = 'primary' }: { selected: boolean; onClick: () => void; children: ReactNode; tone?: 'primary' | 'danger' }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        'inline-flex min-h-11 items-center rounded-full border px-4 text-small font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary',
        !selected && 'border-line bg-surface text-ink hover:border-primary/40',
        selected && tone === 'primary' && 'border-primary bg-primary text-white',
        selected && tone === 'danger' && 'border-danger bg-danger text-white',
      )}
    >
      {children}
    </button>
  );
}
