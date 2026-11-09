// Website pictures: one field to choose from the library or upload a new picture in place.
// Uploading converts the file here (WebP, full + small copies), names it automatically, stores it in
// the site-media bucket, records it in the media library with its alt text, and fills the field.
import clsx from 'clsx';
import { ImagePlus, Images, Search, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { FormField, Select, TextInput } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { uploadMedia } from '@/lib/api';
import { mediaItems, registerMedia, type MediaItem } from '@/lib/cms';
import { prepareSiteImage, slugify, type Crop } from '@/lib/image';
import { publicUrl } from '@/lib/supabase';
import { msg, useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';
import { CropModal } from './CropModal';

export interface Picture { src: string; alt: string; small?: string }
export type Frame = { w: number; h: number; name: string };
export const FRAMES = {
  blogCover: { w: 1376, h: 768, name: msg('blog cover') },
  lessonCover: { w: 1200, h: 896, name: msg('lesson cover') },
  phone: { w: 1170, h: 2652, name: msg('phone screenshot') },
  square: { w: 1200, h: 1200, name: msg('square picture') },
} satisfies Record<string, Frame>;

const KINDS: MediaItem['kind'][] = ['photo', 'illustration', 'screenshot', 'logo'];
const KIND_LABEL: Record<MediaItem['kind'], string> = { photo: msg('Photo'), illustration: msg('Illustration'), screenshot: msg('Screenshot'), logo: msg('Logo') };

/** Convert, upload and register one picture. */
export async function uploadSitePicture(file: File, o: { alt: string; kind: MediaItem['kind']; frame?: Frame; crop?: Crop }) {
  const r = await prepareSiteImage(file, { frame: o.frame, crop: o.crop });
  const base = `library/${slugify(file.name)}-${Math.random().toString(36).slice(2, 8)}`;
  await uploadMedia('site-media', `${base}.webp`, r.full);
  if (r.small) await uploadMedia('site-media', `${base}-760.webp`, r.small);
  const url = publicUrl('site-media', `${base}.webp`);
  const small = r.small ? publicUrl('site-media', `${base}-760.webp`) : null;
  const alt = o.kind === 'illustration' && !/^illustration/i.test(o.alt) ? `Illustration: ${o.alt}` : o.alt;
  await registerMedia({ path: `${base}.webp`, url, url_small: small, width: r.width, height: r.height, bytes: r.full.size, alt, kind: o.kind });
  return { picture: { src: url, alt, ...(small ? { small } : {}) } as Picture, tooSmall: r.tooSmall, width: r.width };
}

/** Upload form: file, alt text (required), kind; crops to the frame when there is one. */
export function UploadForm({ frame, onUploaded, defaultKind = 'photo' }: { frame?: Frame; onUploaded: (p: Picture) => void; defaultKind?: MediaItem['kind'] }) {
  const toast = useToast();
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [alt, setAlt] = useState(''), [kind, setKind] = useState<MediaItem['kind']>(defaultKind);
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const pick = (f: File | null) => { setErr(null); setCrop(null); setFile(f); if (f && frame) setCropFile(f); };
  const go = async () => {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const r = await uploadSitePicture(file, { alt: alt.trim(), kind, frame, crop: crop ?? undefined });
      if (r.tooSmall && frame) toast(t('Uploaded, but it is only {w} px wide: it may look soft on sharp screens (the frame is {fw} px).', { w: r.width, fw: frame.w }), 'bad');
      else toast(t('Picture uploaded'));
      onUploaded(r.picture);
      setFile(null); setAlt(''); setCrop(null); if (input.current) input.current.value = '';
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid content-start gap-4">
        <FormField label={t('Picture file')} required hint={frame ? t('PNG, JPEG or WebP. You choose the part that fits the {name} frame ({w}×{h}).', { name: t(frame.name), w: frame.w, h: frame.h }) : t('PNG, JPEG or WebP. Converted here to WebP before upload.')}>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className="block w-full min-h-12 rounded-md border border-line bg-surface px-4 py-3 text-small text-ink file:mr-4 file:rounded-sm file:border-0 file:bg-primary-soft file:px-3 file:py-1 file:font-semibold file:text-primary" />
        </FormField>
        <FormField label={t('Alt text')} required hint={t('What the picture shows, for people who cannot see it. Illustrations start with “Illustration:”.')}>
          <TextInput value={alt} maxLength={250} onChange={(e) => setAlt(e.target.value)} />
        </FormField>
        <FormField label={t('Kind')}><Select value={kind} onChange={(e) => setKind(e.target.value as MediaItem['kind'])}>{KINDS.map((k) => <option key={k} value={k}>{t(KIND_LABEL[k])}</option>)}</Select></FormField>
        {err && <p role="alert" className="text-small font-semibold text-danger">{err}</p>}
        <div className="flex flex-wrap gap-2">
          <Button icon={Upload} loading={busy} disabled={!file || alt.trim().length < 3} onClick={go}>{t('Upload and use')}</Button>
          {file && frame && <Button variant="outline" onClick={() => setCropFile(file)}>{t('Change crop')}</Button>}
        </div>
      </div>
      {preview && <img src={preview} alt={t('Chosen file')} className="max-h-72 w-full rounded-md border border-line bg-surface-2 object-contain" />}
      {frame && <CropModal file={cropFile} ratio={frame.w / frame.h} title={t('Crop for the {name}', { name: t(frame.name) })} onCancel={() => setCropFile(null)} onDone={(c) => { setCrop(c); setCropFile(null); }} />}
    </div>
  );
}

/** Library grid with search; picking returns the picture. */
export function MediaLibraryModal({ open, onClose, onPick, frame }: { open: boolean; onClose: () => void; onPick: (p: Picture) => void; frame?: Frame }) {
  const { data, loading, error, reload } = useAsync(() => (open ? mediaItems() : Promise.resolve([])), [open]);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const t = useT();
  const items = (data ?? []).filter((m) => !q || m.alt.toLowerCase().includes(q.toLowerCase()) || m.path.includes(q.toLowerCase()));
  return (
    <Modal open={open} onClose={onClose} title={t('Choose a picture')} description={t("From the website's media library, or upload a new one.")} wide>
      <div role="tablist" className="mb-4 flex gap-2">
        <Button size="sm" variant={tab === 'library' ? 'primary' : 'outline'} icon={Images} onClick={() => setTab('library')}>{t('Library')}</Button>
        <Button size="sm" variant={tab === 'upload' ? 'primary' : 'outline'} icon={Upload} onClick={() => setTab('upload')}>{t('Upload new')}</Button>
      </div>
      {tab === 'upload' ? <UploadForm frame={frame} onUploaded={(p) => { onPick(p); reload(true); onClose(); }} /> : (
        <>
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" aria-hidden />
            <TextInput aria-label={t('Search pictures')} placeholder={t('Search by alt text or name')} className="pl-12" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {loading ? <LoadingState text={t('Loading pictures…')} /> : error ? <ErrorState text={error} onRetry={() => reload()} /> : items.length === 0 ? (
            <EmptyState icon={Images} title={q ? t('No picture matches') : t('The library is empty')} text={t('Upload a new picture instead.')} action={<Button icon={Upload} onClick={() => setTab('upload')}>{t('Upload new')}</Button>} />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => { onPick({ src: m.url, alt: m.alt, ...(m.url_small ? { small: m.url_small } : {}) }); onClose(); }}
                    className="block w-full rounded-md border border-line p-2 text-left hover:border-primary focus-visible:ring-2 focus-visible:ring-primary">
                    <img src={m.url_small ?? m.url} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-sm bg-surface-2 object-cover" />
                    <span className="t-caption mt-1 block truncate" title={m.alt}>{m.alt}</span>
                    <span className="t-caption block">{m.width}×{m.height}{frame && m.width && m.width < frame.w ? ` · ${t('smaller than the frame')}` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}

/** A picture field: preview, Choose / Upload, alt text, Remove. */
export function SiteImageField({ label, value, onChange, frame, hint, disabled }: {
  label: string; value: Picture | null; onChange: (p: Picture | null) => void; frame?: Frame; hint?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <div className="min-w-0">
      <p className="mb-2 text-small font-semibold text-ink">{label}</p>
      <div className={clsx('flex flex-wrap gap-3 rounded-md border border-line p-3', !value && 'border-dashed')}>
        {value?.src ? (
          <img src={value.small ?? value.src} alt={value.alt} className="h-28 w-full max-w-40 shrink-0 rounded-sm bg-surface-2 object-contain" />
        ) : (
          <span className="flex h-28 w-full max-w-40 shrink-0 items-center justify-center rounded-sm bg-surface-2 text-ink-2"><ImagePlus className="h-6 w-6" aria-hidden /></span>
        )}
        <div className="grid min-w-48 flex-1 content-start gap-2">
          {value?.src && (
            <FormField label={t('Alt text')} hint={hint}>
              <TextInput value={value.alt} disabled={disabled} maxLength={250} onChange={(e) => onChange({ ...value, alt: e.target.value })} />
            </FormField>
          )}
          {!value?.src && hint && <p className="t-caption">{hint}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" icon={Images} disabled={disabled} onClick={() => setOpen(true)}>{value?.src ? t('Replace') : t('Choose or upload')}</Button>
            {value?.src && <Button size="sm" variant="ghost" icon={Trash2} disabled={disabled} onClick={() => onChange(null)}>{t('Remove')}</Button>}
          </div>
        </div>
      </div>
      <MediaLibraryModal open={open} onClose={() => setOpen(false)} onPick={(p) => onChange(p)} frame={frame} />
    </div>
  );
}
