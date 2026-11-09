// App pictures (bucket app-media). The app finds each picture by its ID (<ID>.webp), so the dashboard
// names files itself: uploading into a slot uses that slot's ID. Nobody types or copies a file name.
import clsx from 'clsx';
import { CheckCircle2, ImagePlus, Images, Smartphone, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useToast } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import pictures from '@/data/app-pictures.json';
import { listMedia, uploadMedia } from '@/lib/api';
import { prepareAppPicture, type AppShape, type Crop } from '@/lib/image';
import { publicUrl } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';
import { CropModal } from './CropModal';

export const BUNDLED = new Set<string>(pictures.bundled);
export const APP_GROUPS = pictures.groups as { key: string; title: string; shape: AppShape; ids: string[] }[];
export const LESSON_SETS = pictures.lessons as { prefix: string; title: string; lesson: string | null; ids: string[] }[];
const RATIO: Record<AppShape, number> = { '4:3': 4 / 3, '16:10': 16 / 10, '1:1': 1 };

/** Picture-ID prefix for a lesson's step pictures (e.g. warm → NB-WARM). */
export function lessonPrefix(lessonId: string, current: string[] = []) {
  const fromCurrent = current.find((x) => x)?.replace(/-P\d+$/, '');
  if (fromCurrent) return fromCurrent;
  const known = LESSON_SETS.find((s) => s.lesson === lessonId);
  if (known) return known.prefix;
  const word = lessonId.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 10) || 'LESSON';
  return `LS-${word}`;
}

/** Uploaded app pictures: ID → last change (used to refresh thumbnails after a replace). */
export function useAppMedia() {
  const q = useAsync(async () => {
    const files = await listMedia('app-media');
    return new Map(files.map((f) => [f.name.replace(/\.webp$/, ''), f.updated_at ?? '']));
  }, []);
  return { uploaded: q.data ?? new Map<string, string>(), loading: q.loading, error: q.error, reload: q.reload };
}
export const appPictureUrl = (id: string, version?: string) => `${publicUrl('app-media', `${id}.webp`)}${version ? `?v=${encodeURIComponent(version)}` : ''}`;

export function AppPictureThumb({ id, version, className }: { id: string; version?: string; className?: string }) {
  const t = useT();
  return version !== undefined ? (
    <img src={appPictureUrl(id, version)} alt={t('App picture {id}', { id })} loading="lazy" className={clsx('w-full rounded-sm border border-line bg-surface-2 object-cover', className)} />
  ) : (
    <span className={clsx('flex w-full flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-line bg-surface-2 text-ink-2', className)}>
      {BUNDLED.has(id) ? <Smartphone className="h-5 w-5" aria-hidden /> : <ImagePlus className="h-5 w-5" aria-hidden />}
      <span className="t-caption px-2 text-center">{BUNDLED.has(id) ? t('Built into the app') : t('No picture yet')}</span>
    </span>
  );
}

export function PictureStatus({ id, uploaded }: { id: string; uploaded: Map<string, string> }) {
  const t = useT();
  if (uploaded.has(id)) return <StatusBadge tone="success" icon={CheckCircle2}>{t('Uploaded')}</StatusBadge>;
  if (BUNDLED.has(id)) return <StatusBadge tone="neutral" icon={Smartphone}>{t('In the app')}</StatusBadge>;
  return <StatusBadge tone="warning">{t('Missing')}</StatusBadge>;
}

/** "Upload" button for one picture ID: choose a file, crop to the shape, convert and upload as <ID>.webp. */
export function UploadAppPicture({ id, shape = '4:3', onDone, label, size = 'sm', variant = 'outline' }: {
  id: string; shape?: AppShape; onDone: () => void; label?: string; size?: 'sm' | 'md'; variant?: 'outline' | 'primary' | 'ghost';
}) {
  const toast = useToast();
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async (f: File, crop: Crop) => {
    setFile(null); setBusy(true);
    try {
      const r = await prepareAppPicture(f, shape, crop);
      await uploadMedia('app-media', `${id}.webp`, r.blob);
      toast(t('{id} uploaded ({kb} KB). Phones get it on their next sync.', { id, kb: Math.round(r.blob.size / 1024) }));
      onDone();
    } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(false);
    if (input.current) input.current.value = '';
  };
  return (
    <>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden
        onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Button size={size} variant={variant} icon={Upload} loading={busy} onClick={() => input.current?.click()}>{label ?? t('Upload')}</Button>
      <CropModal file={file} ratio={RATIO[shape]} title={t('Picture {id}', { id })} hint={t("Choose what shows in the app's {shape} frame. It is converted to WebP under 150 KB.", { shape })}
        onCancel={() => { setFile(null); if (input.current) input.current.value = ''; }} onDone={(c) => file && go(file, c)} />
    </>
  );
}

/** Pick any known or uploaded picture ID. */
export function ChooseAppPicture({ open, onClose, onPick, uploaded }: { open: boolean; onClose: () => void; onPick: (id: string) => void; uploaded: Map<string, string> }) {
  const ids = [...new Set([...uploaded.keys(), ...BUNDLED, ...LESSON_SETS.flatMap((s) => s.ids)])].filter((x) => /-P\d+$/.test(x)).sort();
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t('Choose a picture')} description={t('Lesson pictures uploaded or built into the app.')} wide>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ids.map((id) => (
          <li key={id}>
            <button type="button" onClick={() => { onPick(id); onClose(); }} className="block w-full rounded-md border border-line p-2 text-left hover:border-primary focus-visible:ring-2 focus-visible:ring-primary">
              <AppPictureThumb id={id} version={uploaded.get(id)} className="aspect-[4/3]" />
              <span className="t-caption mt-1 block truncate">{id}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/** One lesson step's picture: shows it, uploads into its own ID, chooses another, or removes it. */
export function StepPictureSlot({ value, suggestedId, onChange, uploaded, onUploaded, disabled, replaceOnly }: {
  value: string; suggestedId: string; onChange: (id: string) => void; uploaded: Map<string, string>; onUploaded: () => void; disabled?: boolean;
  /** Live lesson: the picture file can be replaced, but which picture a step uses is locked. */
  replaceOnly?: boolean;
}) {
  const [choose, setChoose] = useState(false);
  const t = useT();
  const id = value || suggestedId;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {value ? <AppPictureThumb id={value} version={uploaded.get(value)} className="aspect-[4/3]" /> : (
        <span className="flex aspect-[4/3] w-full items-center justify-center rounded-sm border border-dashed border-line bg-surface-2 text-ink-2"><ImagePlus className="h-5 w-5" aria-hidden /><span className="sr-only">{t('No picture')}</span></span>
      )}
      <span className="t-caption truncate">{value ? value : t('No picture')}</span>
      {!disabled && replaceOnly && value && <UploadAppPicture id={value} label={t('Replace picture')} onDone={onUploaded} />}
      {!disabled && !replaceOnly && (
        <div className="flex flex-wrap gap-1">
          <UploadAppPicture id={id} label={value ? t('Replace') : t('Upload')} onDone={() => { onChange(id); onUploaded(); }} />
          <Button size="sm" variant="ghost" icon={Images} onClick={() => setChoose(true)}>{t('Choose')}</Button>
          {value && <Button size="sm" variant="ghost" icon={Trash2} aria-label={t('Remove the picture')} onClick={() => onChange('')}>{t('Remove')}</Button>}
        </div>
      )}
      <ChooseAppPicture open={choose} onClose={() => setChoose(false)} onPick={onChange} uploaded={uploaded} />
    </div>
  );
}
