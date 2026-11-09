import clsx from 'clsx';
import { AlertCircle, CheckCircle2, CloudUpload, History, Loader2, Users } from 'lucide-react';
import { useToast } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { previewToken, revisions, WEBSITE_URL, type Revision } from '@/lib/cms';
import { fmtDateTime } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import { saveLabel, type SaveState } from '@/lib/useAutosave';
import { msg, useT, useTn } from '@/lib/i18n';

/** Opens the real website, showing drafts, through a 30-minute staff-only preview link. */
export async function openPreview(path: string, toast: (t: string, tone?: 'ok' | 'bad') => void) {
  const w = window.open('about:blank', '_blank');
  try {
    const token = await previewToken();
    const url = `${WEBSITE_URL}${path.startsWith('/') ? path : `/${path}`}${path.includes('?') ? '&' : '?'}preview=${token}`;
    if (w) w.location.href = url; else window.location.assign(url);
  } catch (e) {
    w?.close();
    toast((e as Error).message, 'bad');
  }
}
export function usePreview() {
  const toast = useToast();
  return (path: string) => openPreview(path, toast);
}

export function SaveIndicator({ state, dirty, error, onRetry }: { state: SaveState; dirty: boolean; error?: string | null; onRetry?: () => void }) {
  const Icon = state === 'saving' ? Loader2 : state === 'error' ? AlertCircle : dirty ? CloudUpload : CheckCircle2;
  const t = useT();
  return (
    <span role="status" className={clsx('inline-flex min-h-11 items-center gap-2 text-small font-semibold', state === 'error' ? 'text-danger' : 'text-ink-2')} title={error ?? undefined}>
      <Icon className={clsx('h-4 w-4', state === 'saving' && 'animate-spin')} aria-hidden />
      {saveLabel(state, dirty)}
      {state === 'error' && onRetry && <button type="button" onClick={onRetry} className="underline">{t('Try again')}</button>}
    </span>
  );
}

/** "Also editing: …" banner (Realtime presence). */
export function EditingNow({ names }: { names: string[] }) {
  const tn = useTn();
  if (!names.length) return null;
  return (
    <p role="status" className="mb-4 flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-small text-ink">
      <Users className="h-5 w-5 shrink-0 text-warning" aria-hidden />
      <span>{names.length === 1
        ? tn('{names} is also editing this now. Your saves will not overwrite each other: a save made on an older version is refused.', { names: <b>{names.join(', ')}</b> })
        : tn('{names} are also editing this now. Your saves will not overwrite each other: a save made on an older version is refused.', { names: <b>{names.join(', ')}</b> })}</span>
    </p>
  );
}

/** Every saved version of one item, newest first; "Restore" copies it into the draft. */
export function RevisionsModal({ open, onClose, table, rowId, onRestore, describe }: {
  open: boolean; onClose: () => void; table: string; rowId: string; onRestore: (r: Revision) => Promise<void>; describe?: (r: Revision) => string;
}) {
  const toast = useToast();
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => (open ? revisions(table, rowId) : Promise.resolve([])), [open, table, rowId]);
  const note = (n: string) => { const k = ({ save: msg('Saved'), publish: msg('Published'), created: msg('Created') } as Record<string, string>)[n]; return k ? t(k) : n; };
  return (
    <Modal open={open} onClose={onClose} title={t('Version history')} description={t('Every save and publish is kept. Restoring copies that version into the draft; publish it to make it live.')} wide>
      {loading ? <LoadingState text={t('Loading versions…')} /> : error ? <ErrorState text={error} onRetry={() => reload()} /> : !data?.length ? <EmptyState icon={History} title={t('No versions yet')} /> : (
        <ol className="flex flex-col divide-y divide-line">
          {data.map((r, i) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <History className="h-4 w-4 shrink-0 text-ink-2" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-small font-semibold text-ink">{note(r.note)} · {fmtDateTime(r.created_at)}{i === 0 ? ` · ${t('latest')}` : ''}</span>
                {describe && <span className="t-caption block truncate">{describe(r)}</span>}
              </span>
              {i > 0 && <Button size="sm" variant="outline" onClick={async () => { try { await onRestore(r); toast(t('Version restored into the draft')); onClose(); } catch (e) { toast((e as Error).message, 'bad'); } }}>{t('Restore')}</Button>}
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}
