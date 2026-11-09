import { FileLock2, Printer, RotateCcw, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { QrInput } from '@/components/QrInput';
import { Button } from '@/components/ui/Button';
import { BaseCard } from '@/components/ui/Card';
import { ApiError, openNoteShare } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { decryptNote, NoteDecryptError, type DoctorNote } from '@/lib/noteCrypto';
import { parseNoteQr, qrKind } from '@/lib/qr';
import { tr, useT } from '@/lib/i18n';

/** Plain-words reason for every way opening a note can fail. Exported for tests. */
export function noteError(e: unknown, scanned: string): string {
  if (e === 'parse') return qrKind(scanned) === 'record'
    ? tr('This is her record QR, not a Doctor\'s Note. Use "Check a record" for it.')
    : tr('This is not a Safari ya Mama Doctor\'s Note QR code. The text starts with SYM2:');
  if (e instanceof NoteDecryptError) return e.message;
  if (e instanceof ApiError) {
    if (e.code === '42501') return tr('Only health workers can open a shared note. Sign in with a health worker account.');
    if (e.code === 'P0002' || /expired|stopped/i.test(e.message)) return tr('This note has expired, or the mother stopped sharing it. Ask her to share it again from her app.');
    return e.message;
  }
  return tr('The note could not be opened. Check the connection and try again.');
}

export default function DoctorNotePage() {
  const [note, setNote] = useState<(DoctorNote & { expires_at: string }) | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useT();
  // never stored: it lives only in this component's state and is cleared when the page closes
  useEffect(() => () => setNote(null), []);

  const open = useCallback(async (text: string) => {
    setErr(null); setNote(null);
    const qr = parseNoteQr(text);
    if (!qr) { setErr(noteError('parse', text)); return; }
    setBusy(true);
    try {
      const row = await openNoteShare(qr.id);
      if (!row) throw new ApiError('this note has expired or was stopped by the mother', 'P0002');
      const n = await decryptNote(row.ciphertext, qr.key);
      setNote({ ...n, expires_at: row.expires_at });
    } catch (e) { setErr(noteError(e, text)); }
    setBusy(false);
  }, []);

  return (
    <>
      <div className="print:hidden">
        <PageHeader title={t("Doctor's Note")} subtitle={t("Scan the QR on the mother's phone. The note is decrypted here in your browser, is never stored, and closes when you leave this page. Every opening is recorded.")} />
      </div>
      {!note && (
        <BaseCard className="max-w-prose">
          <QrInput onCode={open} busy={busy} label={t('QR text')} placeholder="SYM2:…" />
          {err && <p role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-small font-semibold text-ink"><ShieldAlert className="h-5 w-5 shrink-0 text-danger" aria-hidden />{err}</p>}
        </BaseCard>
      )}
      {note && (
        <article className="max-w-prose rounded-lg border border-line bg-surface p-6 shadow-card print:border-0 print:shadow-none" aria-label={t("Doctor's Note")}>
          <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="t-label flex items-center gap-1"><FileLock2 className="h-4 w-4" aria-hidden /> {t("Doctor's Note · SBAR")}</p>
              <h2 className="t-h2 mt-1">{note.name || t('Mother')}</h2>
              <p className="t-small">{t('Made {made} · share expires {expires}', { made: fmtDateTime(note.made_at), expires: fmtDateTime(note.expires_at) })}</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" icon={Printer} onClick={() => window.print()}>{t('Print')}</Button>
              <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setNote(null)}>{t('Close note')}</Button>
            </div>
          </header>
          {[...note.sections].sort((a, b) => 'SBAR'.indexOf(a.letter) - 'SBAR'.indexOf(b.letter)).map((s) => (
            <section key={s.letter} className="mb-5 break-inside-avoid">
              <h3 className="t-h3 flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-small font-bold text-white" aria-hidden>{s.letter}</span>{s.title}
              </h3>
              <ul className="mt-2 list-disc pl-12 text-body text-ink">{s.rows.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </section>
          ))}
          {note.footer && <footer className="t-caption border-t border-line pt-4">{note.footer}</footer>}
        </article>
      )}
    </>
  );
}
