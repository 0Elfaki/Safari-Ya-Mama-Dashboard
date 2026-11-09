import { History, Stethoscope } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { FormField, TextInput } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { fmtDate, fmtDateTime, isoDay } from '@/lib/format';
import { msg, useT } from '@/lib/i18n';

/** Clinical sign-off before publishing: the reviewer's role (not a private name) and the review date. */
export function SignOffModal({ open, onClose, onConfirm, title, initial, required = true }: {
  open: boolean; onClose: () => void; onConfirm: (reviewer: string | null, on: string | null) => Promise<void>; title: string;
  initial?: { by: string | null; on: string | null }; required?: boolean;
}) {
  const [by, setBy] = useState(''), [on, setOn] = useState(isoDay());
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const t = useT();
  useEffect(() => { if (open) { setBy(initial?.by ?? ''); setOn(initial?.on ?? isoDay()); setErr(null); } }, [open, initial?.by, initial?.on]);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await onConfirm(by.trim() || null, by.trim() ? on : null); onClose(); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <Modal open={open} onClose={onClose} title={title} description={required ? t('Health content needs clinical sign-off before it reaches mothers.') : t('Both languages are checked before it goes live.')}
      footer={<><Button variant="outline" onClick={onClose}>{t('Cancel')}</Button><Button icon={Stethoscope} loading={busy} onClick={go} disabled={required && (by.trim().length < 3 || !on)}>{t('Publish')}</Button></>}>
      <div className="grid gap-4">
        <FormField label={t('Reviewed by (role and cadre)')} required={required} hint={t('For example: Registered midwife, Sample District. Not a private name.')}>
          <TextInput value={by} onChange={(e) => setBy(e.target.value)} maxLength={120} />
        </FormField>
        <FormField label={t('Review date')} required={required}><TextInput type="date" value={on} max={isoDay()} onChange={(e) => setOn(e.target.value)} /></FormField>
        {err && <p role="alert" className="text-small font-semibold text-danger">{err}</p>}
      </div>
    </Modal>
  );
}

export function ReviewBadge({ by, on }: { by: string | null; on: string | null }) {
  const t = useT();
  return by ? <StatusBadge tone="success" icon={Stethoscope}>{t('Reviewed by {name}', { name: by })}{on ? ` · ${fmtDate(on)}` : ''}</StatusBadge> : <StatusBadge tone="warning">{t('Pending clinical review')}</StatusBadge>;
}

export function StateBadge({ status }: { status: 'draft' | 'published' | 'retired' | 'live' | 'changed' | 'archived' }) {
  const t = useT();
  const m = { draft: ['neutral', msg('Draft')], published: ['success', msg('Published')], live: ['success', msg('Live')], changed: ['warning', msg('Live · unpublished changes')], retired: ['neutral', msg('Retired')], archived: ['neutral', msg('Archived')] } as const;
  return <StatusBadge tone={m[status][0]}>{t(m[status][1])}</StatusBadge>;
}

export function VersionList<T extends { version: number; published_at: string }>({ versions, render, onRestore, busy }: {
  versions: T[]; render: (v: T) => ReactNode; onRestore: (v: T) => void; busy?: number | null;
}) {
  const t = useT();
  if (!versions.length) return <p className="t-small">{t('Nothing published yet.')}</p>;
  return (
    <ol className="flex flex-col divide-y divide-line">
      {versions.map((v) => (
        <li key={v.version} className="flex flex-wrap items-center gap-3 py-3">
          <History className="h-4 w-4 shrink-0 text-ink-2" aria-hidden />
          <span className="min-w-0 flex-1"><span className="block text-small font-semibold text-ink">{t('Version {n}', { n: v.version })} · {fmtDateTime(v.published_at)}</span><span className="t-caption block">{render(v)}</span></span>
          <Button size="sm" variant="outline" loading={busy === v.version} onClick={() => onRestore(v)}>{t('Restore into draft')}</Button>
        </li>
      ))}
    </ol>
  );
}

/** Two language columns side by side (stacked on phones). */
export function BiLingual({ en, sw }: { en: ReactNode; sw: ReactNode }) {
  const t = useT();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="min-w-0"><p className="t-label mb-3">{t('English')}</p>{en}</div>
      <div className="min-w-0"><p className="t-label mb-3">{t('Kiswahili')}</p>{sw}</div>
    </div>
  );
}
