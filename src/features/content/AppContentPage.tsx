import { Archive, ArrowLeft, Code2, Images, Megaphone, Phone, Plus, Save, Send, Smartphone, Stethoscope, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { APP_GROUPS, AppPictureThumb, LESSON_SETS, PictureStatus, UploadAppPicture, useAppMedia } from '@/components/media/AppPicture';
import { Chips, Tabs, useTab, useToast } from '@/components/ui/Bits';
import { Button, IconButton } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { FormField, Select, TextArea, TextInput, Toggle } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { appContent, appVersions, archiveApp, geography, manifest, publishApp, restoreApp, saveApp, unpublishApp } from '@/lib/api';
import { fmtDate, fmtDateTime } from '@/lib/format';
import type { AppContent, AppKind } from '@/lib/types';
import { useAsync } from '@/lib/useAsync';
import { msg, useT, useTn } from '@/lib/i18n';
import { BiLingual, ReviewBadge, SignOffModal, StateBadge, VersionList } from './shared';

const KIND: Record<AppKind, { label: string; hint: string; fresh: string }> = {
  announcement: { label: msg('Home announcement'), hint: msg('A short message on the app Home screen. Set dates to show it only for a while.'), fresh: msg('New home announcement') },
  emergency_numbers: { label: msg('Emergency numbers'), hint: msg('The numbers the app shows under Emergency, for one country.'), fresh: msg('New emergency numbers') },
  learn_cover: { label: msg('Learn cover'), hint: msg('The heading and line above the Learn library.'), fresh: msg('New learn cover') },
  other: { label: msg('Other text'), hint: msg('Any other text the app reads by key.'), fresh: msg('New other text') },
};
// Same words the server checks (public.mentions_symptoms): the server decides; this only warns early.
const SYMPTOMS = /(bleed|blood|fever|pain|headache|convuls|fits|seizure|swell|vision|breath|vomit|diarrh|rash|jaundice|discharge|faint|danger sign|damu|homa|maumivu|kichwa|degedege|kifafa|kuvimba|kutapika|kuhara|manjano|kupumua|kuzimia)/i;
interface Item { key: string; kind: AppKind; country: string | null; starts: string | null; ends: string | null; published: boolean; version: number; archived: boolean; symptoms: boolean; en?: AppContent; sw?: AppContent }
const group = (rows: AppContent[]): Item[] => Object.values(rows.reduce<Record<string, Item>>((acc, r) => {
  const it = (acc[r.key] ??= { key: r.key, kind: r.kind, country: r.country_code, starts: r.starts_on, ends: r.ends_on, published: r.published, version: r.version, archived: r.archived, symptoms: r.mentions_symptoms });
  it[r.lang] = r;
  return acc;
}, {}));

// Emergency numbers are stored as lines "Label: number" (the app's format); edited as rows.
interface NumRow { en: string; sw: string; number: string }
const parseNums = (en: string, sw: string): NumRow[] => {
  const a = en.split('\n').filter((l) => l.trim()), b = sw.split('\n').filter((l) => l.trim());
  const split = (l?: string) => { const i = l?.lastIndexOf(':') ?? -1; return i > 0 ? [l!.slice(0, i).trim(), l!.slice(i + 1).trim()] : [l?.trim() ?? '', '']; };
  return Array.from({ length: Math.max(a.length, b.length, 1) }, (_, i) => { const [le, ne] = split(a[i]); const [ls] = split(b[i]); return { en: le, sw: ls, number: ne }; });
};
const joinNums = (rows: NumRow[], g: 'en' | 'sw') => rows.filter((r) => r.number.trim()).map((r) => `${(r[g] || r.en).trim()}: ${r.number.trim()}`).join('\n');
const slugKey = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

function PhoneHome({ text }: { text: string }) {
  const t = useT();
  return (
    <div className="mx-auto max-w-[20rem] overflow-hidden rounded-xl border-8 border-ink bg-bg shadow-raised">
      <div className="bg-primary px-4 py-5 text-white"><p className="text-caption font-semibold">{t('Home')}</p><p className="font-display text-h3 font-extrabold">Habari, Mama</p></div>
      <div className="p-3">
        <div className="flex gap-3 rounded-lg border border-accent/40 bg-accent-soft p-3">
          <Megaphone className="h-5 w-5 shrink-0 text-ink" aria-hidden />
          <p className="min-w-0 whitespace-pre-line text-small text-ink">{text || <span className="text-ink-2">{t('Your announcement shows here.')}</span>}</p>
        </div>
        <div className="mt-3 h-20 rounded-lg bg-surface shadow-card" aria-hidden />
      </div>
    </div>
  );
}

function Editor({ item, isNew, onBack, onChanged }: { item: Item | null; isNew: boolean; onBack: () => void; onChanged: (k?: string) => void }) {
  const toast = useToast();
  const t = useT();
  const geo = useAsync(() => geography(), []);
  const init = () => ({ key: item?.key ?? '', kind: item?.kind ?? 'announcement' as AppKind, country: item?.country ?? '', starts: item?.starts ?? '', ends: item?.ends ?? '', en: item?.en?.value ?? '', sw: item?.sw?.value ?? '', flag: item?.symptoms ?? false });
  const [f, setF] = useState(init);
  const [nums, setNums] = useState<NumRow[]>(() => parseNums(item?.en?.value ?? '', item?.sw?.value ?? ''));
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  useEffect(() => { setF(init()); setNums(parseNums(item?.en?.value ?? '', item?.sw?.value ?? '')); }, [item]); // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = useState<string | null>(null);
  const [signOff, setSignOff] = useState(false);
  const versions = useAsync(() => (item ? appVersions(item.key) : Promise.resolve([])), [item?.key, item?.version]);
  const isNums = f.kind === 'emergency_numbers';
  const en = isNums ? joinNums(nums, 'en') : f.en, sw = isNums ? joinNums(nums, 'sw') : f.sw;
  const okKey = /^[a-z0-9][a-z0-9._-]{1,62}$/.test(f.key);
  const both = !!(en.trim() && sw.trim());
  const symptoms = f.flag || SYMPTOMS.test(en) || SYMPTOMS.test(sw);
  const persist = () => saveApp({ key: f.key, kind: f.kind, country: f.country || null, starts: f.starts || null, ends: f.ends || null, en, sw, symptoms: f.flag });
  const run = async (k: string, fn: () => Promise<unknown>, ok: string) => { setBusy(k); try { await fn(); toast(ok); onChanged(f.key); } catch (e) { toast((e as Error).message, 'bad'); } setBusy(null); };
  const publish = async (by: string | null, on: string | null) => { await persist(); await publishApp(f.key, by, on); toast(t('Published: phones pick it up on their next sync')); onChanged(f.key); };
  // a readable key is made for new items from the type, country and first words
  useEffect(() => {
    if (!isNew) return;
    const base = f.kind === 'emergency_numbers' ? `emergency.${(f.country || 'all').toLowerCase()}` : f.kind === 'learn_cover' ? 'learn.cover' : `${f.kind === 'announcement' ? 'home' : 'text'}.${slugKey(f.en.split(/\s+/).slice(0, 4).join(' ')) || 'new'}`;
    setF((x) => (x.key === base ? x : { ...x, key: base }));
  }, [isNew, f.kind, f.country, f.en]);

  return (
    <>
      <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-11 items-center gap-2 text-small font-semibold text-primary"><ArrowLeft className="h-4 w-4" aria-hidden /> {t('All app content')}</button>
      <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0"><h1 className="t-h1">{isNew ? t(KIND[f.kind].fresh) : t(KIND[f.kind].label)}</h1>
          <p className="t-small mt-1">{f.key}</p>
          {item && <div className="mt-2 flex flex-wrap gap-2"><StateBadge status={item.archived ? 'archived' : item.published ? 'live' : 'draft'} />{item.version > 0 && <span className="t-small">{t('Live version {n}', { n: item.version })}</span>}{item.symptoms && <ReviewBadge by={item.en?.reviewed_by ?? null} on={item.en?.reviewed_on ?? null} />}</div>}</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={Save} loading={busy === 'save'} disabled={!okKey} onClick={() => run('save', persist, t('Draft saved'))}>{t('Save draft')}</Button>
          <Button icon={Send} disabled={!okKey || !both} loading={busy === 'pub'} title={both ? undefined : t('Both languages need text')}
            onClick={() => (symptoms ? setSignOff(true) : run('pub', () => publish(null, null), t('Published')))}>{symptoms ? t('Publish…') : t('Publish')}</Button>
          {item?.published && <Button variant="ghost" icon={Undo2} loading={busy === 'unpub'} onClick={() => run('unpub', () => unpublishApp(f.key), t('Taken out of the app'))}>{t('Unpublish')}</Button>}
          {item && <Button variant="ghost" icon={Archive} loading={busy === 'arch'} onClick={() => run('arch', () => archiveApp(f.key, !item.archived), item.archived ? t('Unarchived') : t('Archived'))}>{item.archived ? t('Unarchive') : t('Archive')}</Button>}
        </div>
      </header>
      {symptoms && <p className="mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-small text-ink"><Stethoscope className="h-5 w-5 shrink-0 text-warning" aria-hidden /> {t('This text mentions symptoms, so it needs clinical sign-off (reviewer role and date) before it can be published. Changing the text clears an earlier sign-off.')}</p>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 content-start gap-6">
          <BaseCard>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <FormField label={t('Type')} hint={t(KIND[f.kind].hint)}><Select value={f.kind} disabled={!isNew} onChange={(e) => setF({ ...f, kind: e.target.value as AppKind })}>{Object.entries(KIND).map(([v, k]) => <option key={v} value={v}>{t(k.label)}</option>)}</Select></FormField>
              <FormField label={t('Country')} hint={t('Empty = every country')}><Select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}><option value="">{t('All countries')}</option>{(geo.data?.countries ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select></FormField>
              {f.kind === 'announcement' && <>
                <FormField label={t('Show from')}><TextInput type="date" value={f.starts} onChange={(e) => setF({ ...f, starts: e.target.value })} /></FormField>
                <FormField label={t('Show until')} hint={t('Leaves the app after this day')}><TextInput type="date" value={f.ends} min={f.starts || undefined} onChange={(e) => setF({ ...f, ends: e.target.value })} /></FormField>
              </>}
            </div>
            {isNew && <FormField className="mt-4 max-w-md" label={t('Key (made for you)')} hint={t('How the app finds this text. You can change it before the first save.')} error={f.key && !okKey ? t('Lower-case letters, digits, dots and dashes') : undefined}><TextInput value={f.key} onChange={(e) => setF({ ...f, key: e.target.value.toLowerCase() })} /></FormField>}
            <div className="mt-2 max-w-prose"><Toggle label={t('This mentions symptoms or health advice')} description={t('Turn on to require clinical sign-off even when no symptom word is detected.')} checked={f.flag} onChange={(v) => setF({ ...f, flag: v })} /></div>
          </BaseCard>
          <BaseCard>
            {isNums ? (
              <>
                <CardHeader icon={Phone} title={t('Numbers')} subtitle={t('One row per number. The label is shown in each language; the number is the same.')} />
                <ul className="grid gap-3">
                  {nums.map((r, i) => (
                    <li key={i} className="grid items-end gap-3 rounded-md border border-line p-3 sm:grid-cols-[1fr_1fr_10rem_auto]">
                      <FormField label={t('Label · English')}><TextInput value={r.en} placeholder="Ambulance" onChange={(e) => setNums((x) => x.map((y, j) => (j === i ? { ...y, en: e.target.value } : y)))} /></FormField>
                      <FormField label={t('Label · Kiswahili')}><TextInput value={r.sw} placeholder="Gari la wagonjwa" onChange={(e) => setNums((x) => x.map((y, j) => (j === i ? { ...y, sw: e.target.value } : y)))} /></FormField>
                      <FormField label={t('Number')}><TextInput inputMode="tel" value={r.number} placeholder="114" onChange={(e) => setNums((x) => x.map((y, j) => (j === i ? { ...y, number: e.target.value.replace(/[^\d+ ]/g, '') } : y)))} /></FormField>
                      <IconButton icon={Trash2} label={t('Remove row {n}', { n: i + 1 })} onClick={() => setNums((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : [{ en: '', sw: '', number: '' }]))} />
                    </li>
                  ))}
                </ul>
                <Button variant="outline" icon={Plus} className="mt-3" onClick={() => setNums((x) => [...x, { en: '', sw: '', number: '' }])}>{t('Add a number')}</Button>
              </>
            ) : (
              <BiLingual en={<FormField label={t('Text')} required hint={`${f.en.length} / 4000`}><TextArea rows={6} maxLength={4000} value={f.en} onChange={(e) => setF({ ...f, en: e.target.value })} /></FormField>}
                sw={<FormField label="Maandishi" required hint={`${f.sw.length} / 4000`}><TextArea rows={6} maxLength={4000} value={f.sw} onChange={(e) => setF({ ...f, sw: e.target.value })} /></FormField>} />
            )}
          </BaseCard>
          {item && (
            <BaseCard>
              <CardHeader title={t('Published versions')} subtitle={t('Restore copies a version, with its sign-off, into the draft.')} />
              {versions.loading ? <LoadingState text={t('Loading versions…')} /> : (
                <VersionList versions={(versions.data ?? []).filter((v) => v.lang === 'en')} busy={busy?.startsWith('v') ? Number(busy.slice(1)) : null}
                  render={(v) => `${v.value.slice(0, 80)}${v.value.length > 80 ? '…' : ''}${v.reviewed_by ? ` · ${t('reviewed by {name}', { name: v.reviewed_by })}` : ''}`}
                  onRestore={(v) => run(`v${v.version}`, () => restoreApp(item.key, v.version), t('Version {n} restored into the draft', { n: v.version }))} />
              )}
            </BaseCard>
          )}
        </div>
        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start" aria-label={t('Preview')}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="t-label">{t('Preview · phone')}</p>
            <Chips label={t('Preview language')} value={lang} onChange={setLang} options={[{ value: 'en', label: t('English') }, { value: 'sw', label: t('Kiswahili') }]} /></div>
          {f.kind === 'announcement' ? <PhoneHome text={lang === 'en' ? en : sw} /> : (
            <div className="rounded-lg border border-line bg-surface p-4 shadow-card"><p className="whitespace-pre-line text-small text-ink">{(lang === 'en' ? en : sw) || <span className="text-ink-2">{t('Nothing yet')}</span>}</p></div>
          )}
        </aside>
      </div>
      <SignOffModal open={signOff} onClose={() => setSignOff(false)} title={t('Publish to the app')} onConfirm={publish} initial={item?.en?.reviewed_by ? { by: item.en.reviewed_by, on: item.en.reviewed_on } : undefined} />
    </>
  );
}

function TextsTab() {
  const { data, loading, error, reload } = useAsync(async () => ({ items: group(await appContent()), man: await manifest().catch(() => null) }), []);
  const [sel, setSel] = useState<string | null>(null), [isNew, setIsNew] = useState(false), [showMan, setShowMan] = useState(false);
  const items = useMemo(() => (data?.items ?? []).filter((i) => !i.archived).sort((a, b) => (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.key < b.key ? -1 : 1)), [data]);
  const t = useT(), tn = useTn();

  if (loading) return <LoadingState text={t('Loading app content…')} />;
  if (error || !data) return <ErrorState text={error ?? ''} onRetry={() => reload()} />;
  if (isNew || sel) return <Editor item={data.items.find((i) => i.key === sel) ?? null} isNew={isNew} onBack={() => { setSel(null); setIsNew(false); }} onChanged={async (k) => { await reload(true); if (k) { setSel(k); setIsNew(false); } }} />;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {data.man ? <p className="t-small">{tn('Content version {v} · {lessons} lessons for the app · {items} live items · checked {when}', { v: <b className="text-ink">{data.man.content_version}</b>, lessons: data.man.lessons.length, items: Object.keys(data.man.content).length, when: fmtDateTime(data.man.generated_at) })}</p> : <span />}
        <div className="flex flex-wrap gap-2"><Button variant="outline" icon={Code2} onClick={() => setShowMan(true)}>{t('What the app downloads')}</Button><Button icon={Plus} onClick={() => setIsNew(true)}>{t('New announcement or text')}</Button></div>
      </div>
      <BaseCard padded={false}>
        {items.length === 0 ? <EmptyState icon={Smartphone} title={t('No app content yet')} text={t('Add a Home announcement or the emergency numbers for a country.')} action={<Button icon={Plus} onClick={() => setIsNew(true)}>{t('New content')}</Button>} /> : (
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.key}><button type="button" onClick={() => setSel(i.key)} className="flex w-full min-w-0 flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-surface-2">
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{t(KIND[i.kind].label)}{i.country ? ` · ${i.country}` : ''}</span>
                  <span className="t-small block truncate">{i.en?.value.split('\n')[0].slice(0, 80)}{i.ends ? ` · ${t('until {date}', { date: fmtDate(i.ends) })}` : ''}</span></span>
                <span className="flex flex-wrap gap-2"><StateBadge status={i.published ? 'live' : 'draft'} />{i.symptoms && !i.en?.reviewed_by && <StatusBadge tone="warning">{t('Pending clinical review')}</StatusBadge>}</span>
              </button></li>
            ))}
          </ul>
        )}
      </BaseCard>
      <Modal open={showMan} onClose={() => setShowMan(false)} title={t('What the app downloads')} description={t('Exactly what app_content_manifest() returns to phones right now.')} wide>
        <pre className="max-h-96 overflow-auto rounded-md bg-surface-2 p-4 text-caption text-ink">{JSON.stringify(data.man, null, 2)}</pre>
      </Modal>
    </>
  );
}

function PicturesTab() {
  const { uploaded, loading, error, reload } = useAppMedia();
  const [show, setShow] = useState<'all' | 'missing'>('all');
  const all = [...APP_GROUPS.flatMap((g) => g.ids), ...LESSON_SETS.flatMap((s) => s.ids)];
  const done = all.filter((id) => uploaded.has(id)).length;
  const t = useT();
  if (loading) return <LoadingState text={t('Loading pictures…')} />;
  if (error) return <ErrorState text={error} onRetry={() => reload()} />;
  const visible = (id: string) => show === 'all' || !uploaded.has(id);
  const grid = (ids: string[], shape: '4:3' | '16:10' | '1:1') => (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
      {ids.filter(visible).map((id) => (
        <li key={id} className="flex min-w-0 flex-col gap-2 rounded-md border border-line p-2">
          <AppPictureThumb id={id} version={uploaded.get(id)} className={shape === '1:1' ? 'aspect-square' : shape === '16:10' ? 'aspect-[16/10]' : 'aspect-[4/3]'} />
          <span className="truncate text-small font-semibold text-ink">{id}</span>
          <PictureStatus id={id} uploaded={uploaded} />
          <UploadAppPicture id={id} shape={shape} label={uploaded.has(id) ? t('Replace') : t('Upload')} onDone={() => reload(true)} />
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <p className="t-small mb-4 max-w-prose">{t("Every picture the app uses, by its picture ID. Click Upload on a picture: you choose the file and the crop, and it is converted (WebP, under 150 KB) and saved under the right name. Phones download new pictures on their next sync. Lesson step pictures can also be uploaded straight from each lesson's steps.")}</p>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge tone={done === all.length ? 'success' : 'warning'} icon={Images}>{t('{done} of {all} uploaded', { done, all: all.length })}</StatusBadge>
        <Chips label={t('Show pictures')} value={show} onChange={setShow} options={[{ value: 'all', label: t('All') }, { value: 'missing', label: t('Not uploaded yet'), count: all.length - done }]} />
      </div>
      <div className="grid gap-6">
        {APP_GROUPS.map((g) => g.ids.some(visible) && (
          <BaseCard key={g.key}><CardHeader title={t(g.title)} subtitle={t('{done} of {all} uploaded · {shape} frame', { done: g.ids.filter((i) => uploaded.has(i)).length, all: g.ids.length, shape: g.shape })} />{grid(g.ids, g.shape)}</BaseCard>
        ))}
        {LESSON_SETS.map((s) => s.ids.some(visible) && (
          <BaseCard key={s.prefix}><CardHeader title={t('Lesson: {title}', { title: s.title })} subtitle={`${s.prefix} · ${t('{done} of {all} uploaded', { done: s.ids.filter((i) => uploaded.has(i)).length, all: s.ids.length })}`} />{grid(s.ids, '4:3')}</BaseCard>
        ))}
      </div>
    </>
  );
}

const TABS = ['texts', 'pictures'] as const;
export default function AppContentPage() {
  const [tab, setTab] = useTab(TABS, 'texts');
  const t = useT();
  return (
    <>
      <PageHeader title={t('App content & pictures')} subtitle={t('Everything the mother app downloads besides lessons: Home announcements, emergency numbers per country, the Learn cover, and every picture.')} />
      <Tabs label={t('App content')} value={tab} onChange={setTab} tabs={[{ value: 'texts', label: t('Announcements & texts'), icon: Megaphone }, { value: 'pictures', label: t('Pictures'), icon: Images }]} />
      {tab === 'texts' ? <TextsTab /> : <PicturesTab />}
    </>
  );
}
