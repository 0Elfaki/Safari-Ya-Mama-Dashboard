import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, EyeOff, Siren, type LucideIcon } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { levelLabel } from '@/lib/format';
import { useT } from '@/lib/i18n';
import type { Level } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

/** Warning level: icon + words, never colour alone. */
export function LevelBadge({ level, short }: { level: Level; short?: boolean }) {
  const map = { red: { tone: 'danger', icon: Siren }, amber: { tone: 'warning', icon: AlertTriangle }, green: { tone: 'success', icon: CheckCircle2 } } as const;
  const m = map[level] ?? map.green;
  const t = useT();
  return (
    <StatusBadge tone={m.tone} icon={m.icon}>
      {short ? { red: t('Red'), amber: t('Amber'), green: t('Green') }[level] : t(levelLabel[level])}
    </StatusBadge>
  );
}

/** A figure with its label. `hidden` shows the privacy-suppressed state. */
export function Kpi({ label, value, sub, tone, icon: Icon, hidden }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'danger' | 'warning' | 'success'; icon?: LucideIcon; hidden?: boolean }) {
  const t = useT();
  return (
    <div className={clsx('min-w-0 rounded-lg border bg-surface p-4 shadow-card', tone === 'danger' ? 'border-danger/30' : tone === 'warning' ? 'border-warning/30' : 'border-line')}>
      <div className="flex items-start gap-2">
        {Icon && <Icon className={clsx('mt-0.5 h-4 w-4 shrink-0', tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-primary')} aria-hidden />}
        <p className="t-small min-w-0 font-semibold leading-snug text-ink-2">{label}</p>
      </div>
      {hidden ? (
        <p className="mt-2 flex items-center gap-2 text-small font-semibold text-ink-2" title={t('1 to 4 mothers: the exact figure is hidden so nobody can be recognised')}>
          <EyeOff className="h-4 w-4" aria-hidden /> {t('Fewer than 5')}
        </p>
      ) : (
        <p className={clsx('t-num mt-1 font-display text-h2 font-extrabold', tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-ink')}>{value}</p>
      )}
      {sub && <p className="t-caption mt-1">{sub}</p>}
    </div>
  );
}

/** Responsive table: scrolls sideways inside its card on small screens, never the page. */
export function Table({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    // relative: screen-reader-only cells (position:absolute) stay inside the scroll box instead of widening the page
    <div className="relative -mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[44rem] border-collapse text-left text-small">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}
export const Th = ({ children, num, className }: { children?: ReactNode; num?: boolean; className?: string }) => (
  <th scope="col" className={clsx('whitespace-nowrap border-b border-line bg-surface-2 px-5 py-3 font-semibold text-ink-2 first:pl-5 sm:first:pl-6', num && 'text-right', className)}>{children}</th>
);
export const Td = ({ children, num, className }: { children?: ReactNode; num?: boolean; className?: string }) => (
  <td className={clsx('border-b border-line px-5 py-3 align-top text-ink first:pl-5 sm:first:pl-6', num && 't-num text-right', className)}>{children}</td>
);

/** Single-choice filter chips (aria-pressed). */
export function Chips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
          className={clsx('inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-small font-semibold transition-colors',
            value === o.value ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink hover:border-primary/40')}>
          {o.label}
          {o.count !== undefined && <span className={clsx('t-num rounded-full px-2 text-caption', value === o.value ? 'bg-white/20' : 'bg-surface-2 text-ink-2')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ───────── toasts
type Toast = { id: number; text: string; tone: 'ok' | 'bad' };
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'bad') => void>(() => undefined);
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'bad' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    window.setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 5000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:left-auto sm:right-6 sm:items-end" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role="status" className={clsx('pointer-events-auto flex max-w-dialog items-start gap-2 rounded-md border px-4 py-3 text-small font-semibold shadow-raised',
            t.tone === 'bad' ? 'border-danger/30 bg-danger-soft text-danger' : 'border-success/30 bg-success-soft text-success')}>
            {t.tone === 'bad' ? <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden /> : <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />}
            <span className="text-ink">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Tabs kept in the address (?tab=…), so a tab can be linked and survives a reload. */
export function useTab<T extends string>(tabs: readonly T[], fallback: T): [T, (t: T) => void] {
  const [params, setParams] = useSearchParams();
  const v = params.get('tab') as T | null;
  const cur = v && tabs.includes(v) ? v : fallback;
  return [cur, (t: T) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', t); return n; }, { replace: true })];
}
export function Tabs<T extends string>({ value, onChange, tabs, label }: { value: T; onChange: (t: T) => void; tabs: { value: T; label: string; icon?: LucideIcon; count?: number }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button key={t.value} role="tab" type="button" aria-selected={value === t.value} onClick={() => onChange(t.value)}
          className={clsx('-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-small font-semibold transition-colors',
            value === t.value ? 'border-primary text-primary' : 'border-transparent text-ink-2 hover:text-ink')}>
          {t.icon && <t.icon className="h-4 w-4" aria-hidden />}{t.label}
          {t.count !== undefined && <span className="t-num rounded-full bg-surface-2 px-2 text-caption text-ink-2">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
