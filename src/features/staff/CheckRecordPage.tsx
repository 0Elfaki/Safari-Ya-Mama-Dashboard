import { CheckCircle2, ClipboardCheck, RotateCcw, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { useCallback, useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { QrInput } from '@/components/QrInput';
import { Button } from '@/components/ui/Button';
import { BaseCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { verifyRecordProof } from '@/lib/api';
import { fmtDate, fmtDateTime, vaccineLabel, visitLabel } from '@/lib/format';
import { parseRecordQr, qrKind } from '@/lib/qr';
import { useT } from '@/lib/i18n';

type Result = Awaited<ReturnType<typeof verifyRecordProof>>;

export default function CheckRecordPage() {
  const [res, setRes] = useState<{ r: Result } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useT();

  const check = useCallback(async (text: string) => {
    setErr(null); setRes(null);
    const hash = parseRecordQr(text);
    if (!hash) {
      setErr(qrKind(text) === 'note' ? t('This is a Doctor\'s Note QR. Open it under "Doctor\'s Note".') : t('This is not a Safari ya Mama record QR. The text is SYM1: followed by 64 letters and digits.'));
      return;
    }
    setBusy(true);
    try { setRes({ r: await verifyRecordProof(hash) }); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }, [t]);

  const r = res?.r;
  return (
    <>
      <PageHeader title={t('Check a record')} subtitle={t("Scan the record QR from the mother's app. It confirms her vaccine and visit dates were issued by Safari ya Mama and have not been changed. Every check is recorded.")} />
      {!res && (
        <BaseCard className="max-w-prose">
          <QrInput onCode={check} busy={busy} label={t('QR text')} placeholder="SYM1:…" />
          {err && <p role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-small font-semibold text-ink"><ShieldAlert className="h-5 w-5 shrink-0 text-danger" aria-hidden />{err}</p>}
        </BaseCard>
      )}
      {res && (
        <div className="flex max-w-prose flex-col gap-4">
          {!r ? (
            <div role="alert" className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft p-5">
              <ShieldQuestion className="h-6 w-6 shrink-0 text-warning" aria-hidden />
              <div><p className="font-semibold text-ink">{t('Unknown record')}</p><p className="t-small mt-1 text-ink">{t('No record with this fingerprint was issued by Safari ya Mama. Do not rely on it; check her clinic card.')}</p></div>
            </div>
          ) : r.chain_ok ? (
            <div role="status" className="flex items-start gap-3 rounded-lg border border-success/30 bg-success-soft p-5">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-success" aria-hidden />
              <div><p className="font-semibold text-ink">{t('Genuine and unchanged')}</p><p className="t-small mt-1 text-ink">{t('Issued {when} · ledger entry #{n}. The fingerprint and the chain both match.', { when: fmtDateTime(r.issued_at), n: r.ledger_seq })}</p></div>
            </div>
          ) : (
            <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft p-5">
              <ShieldAlert className="h-6 w-6 shrink-0 text-danger" aria-hidden />
              <div><p className="font-semibold text-ink">{t('Warning: this record does not match the ledger')}</p><p className="t-small mt-1 text-ink">{t('The stored record or its chain was changed after it was issued. Do not rely on these dates; tell the programme team.')}</p></div>
            </div>
          )}
          {r && (
            <>
              <BaseCard aria-labelledby="rec-vx">
                <h2 id="rec-vx" className="t-h3 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" aria-hidden /> {t('Vaccines')}</h2>
                {r.record_doc.vaccines.length === 0 ? <p className="t-small mt-2">{t('None in this record.')}</p> : (
                  <ul className="mt-3 flex flex-col divide-y divide-line">
                    {r.record_doc.vaccines.map((v, i) => (
                      <li key={i} className="flex min-h-11 items-center justify-between gap-3 py-2">
                        <span className="text-small font-semibold text-ink">{vaccineLabel(v.vaccine_key)}</span>
                        {v.given_on ? <StatusBadge tone="success">{t('Given {date}', { date: fmtDate(v.given_on) })}</StatusBadge> : <StatusBadge>{t('Due {date}', { date: fmtDate(v.due_on) })}</StatusBadge>}
                      </li>
                    ))}
                  </ul>
                )}
              </BaseCard>
              <BaseCard aria-labelledby="rec-visits">
                <h2 id="rec-visits" className="t-h3">{t('Visits')}</h2>
                {r.record_doc.visits.length === 0 ? <p className="t-small mt-2">{t('None in this record.')}</p> : (
                  <ul className="mt-3 flex flex-col divide-y divide-line">
                    {r.record_doc.visits.map((v, i) => (
                      <li key={i} className="flex min-h-11 items-center justify-between gap-3 py-2">
                        <span className="text-small font-semibold text-ink">{visitLabel(v.kind, v.contact_no)}</span>
                        {v.attended_on ? <StatusBadge tone="success">{t('Attended {date}', { date: fmtDate(v.attended_on) })}</StatusBadge> : <StatusBadge>{t('Due {date}', { date: fmtDate(v.due_on) })}</StatusBadge>}
                      </li>
                    ))}
                  </ul>
                )}
              </BaseCard>
              <p className="t-caption">{t('The record shows dates only. It does not say whose record it is and is not a clinical result.')}</p>
            </>
          )}
          <Button variant="outline" icon={RotateCcw} onClick={() => setRes(null)} className="self-start">{t('Check another')}</Button>
        </div>
      )}
    </>
  );
}
