import { Archive, Copy, Image as ImageIcon, Link2, Save, Upload } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { UploadForm } from '@/components/media/SiteImage';
import { Chips, useToast } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { FormField, SearchInput, Select, TextInput } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { archiveMedia, mediaItems, mediaUsage, updateMedia, type MediaItem } from '@/lib/cms';
import { fmtDateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';
import { msg, useT } from '@/lib/i18n';

const KINDS: MediaItem['kind'][] = ['photo', 'illustration', 'screenshot', 'logo'];
const KIND: Record<MediaItem['kind'], string> = { photo: msg('Photo'), illustration: msg('Illustration'), screenshot: msg('Screenshot'), logo: msg('Logo') };

function Details({ item, onClose, onChanged }: { item: MediaItem | null; onClose: () => void; onChanged: () => void }) {
  const s = useSession();
  const toast = useToast();
  const [alt, setAlt] = useState(item?.alt ?? ''), [kind, setKind] = useState<MediaItem['kind']>(item?.kind ?? 'photo');
  const [busy, setBusy] = useState<string | null>(null);
  const t = useT();
  const usage = useAsync(() => (item ? mediaUsage(item.url) : Promise.resolve([])), [item?.url]);
  if (!item) return null;
  const run = async (k: string, fn: () => Promise<unknown>, ok: string) => { setBusy(k); try { await fn(); toast(ok); onChanged(); onClose(); } catch (e) { toast((e as Error).message, 'bad'); } setBusy(null); };
  return (
    <Modal open onClose={onClose} title={t('Picture details')} wide>
      <div className="grid gap-6 md:grid-cols-2">
        <img src={item.url} alt={item.alt} className="w-full rounded-md border border-line bg-surface-2 object-contain" />
        <div className="grid content-start gap-4">
          <p className="t-small">{t('{w}×{h} px · {kb} KB · added {date}', { w: item.width ?? '', h: item.height ?? '', kb: Math.round((item.bytes ?? 0) / 1024), date: fmtDateTime(item.created_at) })}</p>
          <FormField label={t('Alt text')} required><TextInput value={alt} disabled={!s.can('edit')} onChange={(e) => setAlt(e.target.value)} /></FormField>
          <FormField label={t('Kind')}><Select value={kind} disabled={!s.can('edit')} onChange={(e) => setKind(e.target.value as MediaItem['kind'])}>{KINDS.map((k) => <option key={k} value={k}>{t(KIND[k])}</option>)}</Select></FormField>
          <div>
            <p className="mb-2 flex items-center gap-2 text-small font-semibold text-ink"><Link2 className="h-4 w-4" aria-hidden /> {t('Used in')}</p>
            {usage.loading ? <LoadingState text={t('Checking…')} className="py-2" /> : (usage.data ?? []).length === 0 ? <p className="t-small">{t('Not used anywhere yet.')}</p> : (
              <ul className="t-small list-disc pl-5">{usage.data!.map((u, i) => <li key={i}>{u.kind}: {u.label}</li>)}</ul>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {s.can('edit') && <Button icon={Save} loading={busy === 'save'} disabled={alt.trim().length < 3} onClick={() => run('save', () => updateMedia(item.id, alt.trim(), kind), t('Saved'))}>{t('Save')}</Button>}
            <Button variant="outline" icon={Copy} onClick={async () => { try { await navigator.clipboard.writeText(item.url); toast(t('Address copied')); } catch { toast(t('Copy failed'), 'bad'); } }}>{t('Copy address')}</Button>
            {s.can('edit') && <Button variant="ghost" icon={Archive} loading={busy === 'arch'} disabled={(usage.data ?? []).length > 0} title={(usage.data ?? []).length ? t('Replace it where it is used first') : undefined}
              onClick={() => run('arch', () => archiveMedia(item.id), t('Picture archived'))}>{t('Archive')}</Button>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function MediaLibraryPage() {
  const s = useSession();
  const { data, loading, error, reload } = useAsync(mediaItems, []);
  const [kind, setKind] = useState<'all' | MediaItem['kind']>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<MediaItem | null>(null);
  const [upload, setUpload] = useState(false);
  const t = useT();
  const list = (data ?? []).filter((m) => (kind === 'all' || m.kind === kind) && (!q || m.alt.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHeader title={t('Media library')} subtitle={t('Pictures for the website. Each upload is converted to WebP with a small copy for phones, and must have alt text. A picture that is in use cannot be archived. App pictures are under Mobile app › App content & pictures.')}
        actions={s.can('edit') ? <Button icon={Upload} onClick={() => setUpload(!upload)}>{upload ? t('Close upload') : t('Upload a picture')}</Button> : undefined} />
      {upload && <BaseCard className="mb-6"><CardHeader icon={Upload} title={t('Upload a picture')} /><UploadForm onUploaded={() => { reload(true); setUpload(false); }} /></BaseCard>}
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <SearchInput value={q} onChange={setQ} placeholder={t('Search by alt text')} label={t('Search pictures')} />
        <Chips label={t('Kind')} value={kind} onChange={setKind} options={[{ value: 'all', label: t('All') }, ...KINDS.map((k) => ({ value: k, label: t(KIND[k]) }))]} />
      </div>
      {loading ? <LoadingState text={t('Loading pictures…')} /> : error ? <ErrorState text={error} onRetry={() => reload()} /> : (
        <BaseCard>
          {list.length === 0 ? <EmptyState icon={ImageIcon} title={data?.length ? t('No picture matches') : t('No pictures yet')} text={t('Pictures uploaded while editing pages and posts also appear here.')} /> : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {list.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setOpen(m)} className="block w-full rounded-md border border-line p-2 text-left hover:border-primary focus-visible:ring-2 focus-visible:ring-primary">
                    <img src={m.url_small ?? m.url} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-sm bg-surface-2 object-cover" />
                    <span className="mt-2 block truncate text-small font-semibold text-ink" title={m.alt}>{m.alt}</span>
                    <span className="t-caption block">{t(KIND[m.kind])} · {m.width}×{m.height}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </BaseCard>
      )}
      <Details key={open?.id} item={open} onClose={() => setOpen(null)} onChanged={() => reload(true)} />
    </>
  );
}
