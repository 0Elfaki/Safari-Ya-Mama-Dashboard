import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Globe, ListOrdered, Lock, Plus, Save, Send, Smartphone, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { AppPictureThumb, lessonPrefix, StepPictureSlot, useAppMedia } from '@/components/media/AppPicture';
import { Chips, useToast } from '@/components/ui/Bits';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { FormField, Select, TextArea, TextInput } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { createLesson, lessons as loadLessons, lessonVersions, publishLesson, restoreLesson, saveLesson, saveTranslation, setLessonStatus } from '@/lib/api';
import { LESSON_PICTURE_ID } from '@/lib/image';
import type { Lesson, LessonTr } from '@/lib/types';
import { useAsync } from '@/lib/useAsync';
import { msg, useT } from '@/lib/i18n';
import { BiLingual, ReviewBadge, SignOffModal, StateBadge, VersionList } from './shared';

const CAT: Record<Lesson['category'], string> = { preg: msg('Pregnancy'), nutri: msg('Nutrition'), feed: msg('Feeding'), newborn: msg('Newborn') };
const SITE = (import.meta.env.VITE_WEBSITE_URL as string | undefined) ?? 'https://safariyamama.com/';
const trOf = (l: Lesson, g: 'en' | 'sw'): LessonTr => l.lesson_translations.find((x) => x.lang === g) ?? { lesson_id: l.id, lang: g, title: '', steps: [], audio_path: null, reviewed_by: null, reviewed_on: null };

interface Step { en: string; sw: string; pic: string }
const toSteps = (l: Lesson): Step[] => {
  const en = trOf(l, 'en').steps, sw = trOf(l, 'sw').steps;
  return Array.from({ length: Math.max(en.length, sw.length) }, (_, i) => ({ en: en[i] ?? '', sw: sw[i] ?? '', pic: l.step_pictures[i] ?? '' }));
};

function Editor({ lesson, onBack, onChanged }: { lesson: Lesson; onBack: () => void; onChanged: () => void }) {
  const toast = useToast();
  const t = useT();
  const draft = lesson.status === 'draft';
  const media = useAppMedia();
  const [meta, setMeta] = useState({ category: lesson.category, format: lesson.format, minutes: String(lesson.minutes ?? ''), stage: lesson.stage, channels: lesson.channels });
  const [title, setTitle] = useState({ en: trOf(lesson, 'en').title, sw: trOf(lesson, 'sw').title });
  const [steps, setSteps] = useState<Step[]>(() => toSteps(lesson));
  const [busy, setBusy] = useState<string | null>(null);
  const [signOff, setSignOff] = useState(false);
  const [lang, setLang] = useState<'en' | 'sw'>('en');
  const versions = useAsync(() => lessonVersions(lesson.id), [lesson.id, lesson.version, lesson.status]);
  useEffect(() => {
    setMeta({ category: lesson.category, format: lesson.format, minutes: String(lesson.minutes ?? ''), stage: lesson.stage, channels: lesson.channels });
    setTitle({ en: trOf(lesson, 'en').title, sw: trOf(lesson, 'sw').title });
    setSteps(toSteps(lesson));
  }, [lesson]);

  const prefix = lessonPrefix(lesson.id, lesson.step_pictures);
  const setStep = (i: number, p: Partial<Step>) => setSteps((x) => x.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const moveStep = (i: number, d: -1 | 1) => setSteps((x) => { const n = [...x]; const j = i + d; if (j < 0 || j >= n.length) return x; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try { await fn(); toast(ok); onChanged(); } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };
  /** Write the draft (throws, so Publish stops if saving fails). Unchanged text keeps its review. */
  const persist = async () => {
    const bad = steps.map((s) => s.pic).filter((p) => p && !LESSON_PICTURE_ID.test(p));
    if (bad.length) throw new Error(t('These are not lesson step pictures: {ids}', { ids: bad.join(', ') }));
    const pics = steps.some((s) => s.pic) ? steps.map((s) => s.pic) : [];
    await saveLesson(lesson.id, { category: meta.category, format: meta.format, minutes: meta.minutes ? Number(meta.minutes) : null, stage: meta.stage, channels: meta.channels, step_pictures: pics });
    for (const g of ['en', 'sw'] as const) {
      const cur = trOf(lesson, g), list = steps.map((s) => s[g].trim());
      if (cur.title !== title[g].trim() || cur.steps.join('\n') !== list.join('\n')) await saveTranslation(lesson.id, g, title[g].trim(), list);
    }
  };
  const save = () => run('save', persist, t('Draft saved. Changed text needs clinical review again.'));
  const publishedTo = (where: string) => (where === 'the website' ? t('Published to the website') : where === 'the app' ? t('Published to the app')
    : where === 'the website and the app' ? t('Published to the website and the app') : where === 'the app and the website' ? t('Published to the app and the website') : t('Published to {where}', { where }));
  const ready = title.en.trim().length >= 3 && title.sw.trim().length >= 3 && steps.length > 0 && steps.every((s) => s.en.trim() && s.sw.trim());
  const en = trOf(lesson, 'en'), sw = trOf(lesson, 'sw');
  const reviewed = en.reviewed_by && sw.reviewed_by;

  return (
    <>
      <button type="button" onClick={onBack} className="mb-4 inline-flex min-h-11 items-center gap-2 text-small font-semibold text-primary"><ArrowLeft className="h-4 w-4" aria-hidden /> {t('All lessons')}</button>
      <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="t-h1">{en.title || lesson.id}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2"><StateBadge status={lesson.status} /><StatusBadge>v{lesson.version}</StatusBadge><StatusBadge icon={null}>{lesson.id}</StatusBadge>
            {lesson.channels.includes('web') && <StatusBadge tone="primary" icon={Globe}>{t('Website')}</StatusBadge>}{lesson.channels.includes('app') && <StatusBadge tone="primary" icon={Smartphone}>{t('App')}</StatusBadge>}
            <ReviewBadge by={en.reviewed_by} on={en.reviewed_on} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {draft ? <>
            <Button variant="outline" icon={Save} loading={busy === 'save'} onClick={save}>{t('Save draft')}</Button>
            <Button icon={Send} disabled={!ready} onClick={() => setSignOff(true)} title={ready ? undefined : t('Both languages need a title and text in every step')}>{t('Publish…')}</Button>
          </> : lesson.status === 'published' ? <>
            {lesson.channels.includes('web') && <ButtonLink to={`${SITE.replace(/\/?$/, '/')}#learn/${encodeURIComponent(lesson.id)}`} variant="ghost" icon={Globe}>{t('View on website')}</ButtonLink>}
            <Button variant="outline" icon={Undo2} loading={busy === 'unpub'} onClick={() => { if (confirm(t('Unpublish to edit? It leaves the website and the app until you publish it again.'))) run('unpub', () => setLessonStatus(lesson.id, 'draft'), t('Unpublished: now a draft')); }}>{t('Unpublish to edit')}</Button>
            <Button variant="ghost" loading={busy === 'retire'} onClick={() => { if (confirm(t('Retire this lesson? It leaves the website and the app.'))) run('retire', () => setLessonStatus(lesson.id, 'retired'), t('Lesson retired')); }}>{t('Retire')}</Button>
          </> : <Button variant="outline" loading={busy === 'unret'} onClick={() => run('unret', () => setLessonStatus(lesson.id, 'draft'), t('Back to draft'))}>{t('Make it a draft again')}</Button>}
        </div>
      </header>
      {!draft && <p className="mb-4 flex items-center gap-2 rounded-md border border-line bg-surface-2 px-4 py-3 text-small text-ink"><Lock className="h-4 w-4 shrink-0" aria-hidden /> {lesson.status === 'published' ? t('This lesson is live, so its text is locked. Unpublish it to edit, then publish again with clinical sign-off. Step pictures can still be replaced with a new file.') : t('Retired lessons are read-only.')}</p>}
      {draft && !ready && <p className="mb-4 rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-small text-ink">{t('Publishing is blocked until English and Kiswahili both have a title and every step has text in both languages.')}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 content-start gap-6">
          <BaseCard>
            <CardHeader icon={BookOpen} title={t('Lesson')} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label={t('Category')}><Select disabled={!draft} value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value as Lesson['category'] })}>{Object.entries(CAT).map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}</Select></FormField>
              <FormField label={t('Format')}><Select disabled={!draft} value={meta.format} onChange={(e) => setMeta({ ...meta, format: e.target.value as Lesson['format'] })}><option value="guide">{t('Picture guide')}</option><option value="video">{t('Video')}</option><option value="audio">{t('Audio')}</option></Select></FormField>
              <FormField label={t('Stage')}><Select disabled={!draft} value={meta.stage} onChange={(e) => setMeta({ ...meta, stage: e.target.value as Lesson['stage'] })}><option value="pregnant">{t('Pregnancy')}</option><option value="baby">{t('Baby')}</option><option value="both">{t('Both')}</option></Select></FormField>
              <FormField label={t('Minutes')}><TextInput disabled={!draft} inputMode="numeric" value={meta.minutes} onChange={(e) => setMeta({ ...meta, minutes: e.target.value.replace(/\D/g, '') })} /></FormField>
            </div>
            <fieldset disabled={!draft} className="mt-4"><legend className="mb-2 text-small font-semibold text-ink">{t('Show on')}</legend>
              <div className="flex flex-wrap gap-4">
                {(['web', 'app'] as const).map((c) => (
                  <label key={c} className="inline-flex min-h-11 items-center gap-2 text-small font-semibold text-ink">
                    <input type="checkbox" className="h-6 w-6 accent-primary" checked={meta.channels.includes(c)}
                      onChange={(e) => setMeta({ ...meta, channels: e.target.checked ? [...meta.channels, c] : meta.channels.filter((x) => x !== c).length ? meta.channels.filter((x) => x !== c) : meta.channels })} />
                    {c === 'web' ? t('Website') : t('App')}
                  </label>
                ))}
              </div>
            </fieldset>
          </BaseCard>
          <BaseCard>
            <BiLingual en={<FormField label={t('Title')} required><TextInput value={title.en} readOnly={!draft} onChange={(e) => setTitle({ ...title, en: e.target.value })} /></FormField>}
              sw={<FormField label="Kichwa" required><TextInput value={title.sw} readOnly={!draft} onChange={(e) => setTitle({ ...title, sw: e.target.value })} /></FormField>} />
          </BaseCard>
          <BaseCard>
            <CardHeader icon={ListOrdered} title={t('Steps ({n})', { n: steps.length })} subtitle={t('Each step has its text in both languages and an optional picture. Upload a picture right in its step: it is converted, named {prefix}-P1, -P2… and attached for you.', { prefix })} />
            <ol className="grid gap-4">
              {steps.map((st, i) => (
                <li key={i} className="grid gap-4 rounded-md border border-line p-4 lg:grid-cols-[minmax(0,1fr)_11rem]">
                  <div className="grid min-w-0 gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-small font-bold text-white">{i + 1}</span>
                      {draft && <span className="flex gap-1">
                        <IconButton icon={ArrowUp} label={t('Move step {n} up', { n: i + 1 })} disabled={i === 0} onClick={() => moveStep(i, -1)} />
                        <IconButton icon={ArrowDown} label={t('Move step {n} down', { n: i + 1 })} disabled={i === steps.length - 1} onClick={() => moveStep(i, 1)} />
                        <IconButton icon={Trash2} label={t('Remove step {n}', { n: i + 1 })} onClick={() => { if (confirm(t('Remove step {n}?', { n: i + 1 }))) setSteps((x) => x.filter((_, j) => j !== i)); }} />
                      </span>}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label={t('Step {n} · English', { n: i + 1 })} required><TextArea rows={3} value={st.en} readOnly={!draft} onChange={(e) => setStep(i, { en: e.target.value })} /></FormField>
                      <FormField label={`Hatua ${i + 1} · Kiswahili`} required><TextArea rows={3} value={st.sw} readOnly={!draft} onChange={(e) => setStep(i, { sw: e.target.value })} /></FormField>
                    </div>
                  </div>
                  <StepPictureSlot value={st.pic} suggestedId={`${prefix}-P${i + 1}`} uploaded={media.uploaded} onUploaded={() => media.reload(true)}
                    disabled={lesson.status === 'retired'} replaceOnly={lesson.status === 'published'}
                    onChange={(id) => setStep(i, { pic: id })} />
                </li>
              ))}
            </ol>
            {draft && <Button variant="outline" icon={Plus} className="mt-4" onClick={() => setSteps((x) => [...x, { en: '', sw: '', pic: '' }])}>{t('Add a step')}</Button>}
          </BaseCard>
          <BaseCard>
            <CardHeader title={t('Published versions')} subtitle={t('Restore copies an earlier published version into the draft, with its sign-off. Publish it to make it live again.')} />
            {versions.loading ? <LoadingState text={t('Loading versions…')} /> : (
              <VersionList versions={versions.data ?? []} busy={busy?.startsWith('v') ? Number(busy.slice(1)) : null}
                render={(v) => `${v.snapshot.tr?.en?.title ?? ''} · ${t('reviewed by {name}', { name: v.snapshot.tr?.en?.reviewed_by ?? '—' })}`}
                onRestore={(v) => { if (confirm(lesson.status === 'published' ? t('Restore version {n} into the draft? The lesson leaves the website and app until you publish it again.', { n: v.version }) : t('Restore version {n} into the draft?', { n: v.version }))) run(`v${v.version}`, () => restoreLesson(lesson.id, v.version), t('Version {n} restored into the draft', { n: v.version })); }} />
            )}
          </BaseCard>
        </div>
        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start" aria-label={t('Live preview')}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="t-label">{t('Live preview · phone')}</p>
            <Chips label={t('Preview language')} value={lang} onChange={setLang} options={[{ value: 'en', label: t('English') }, { value: 'sw', label: t('Kiswahili') }]} /></div>
          <LessonPreview title={title[lang]} steps={steps.map((s) => s[lang])} pics={steps.map((s) => s.pic)} uploaded={media.uploaded} />
        </aside>
      </div>

      <SignOffModal open={signOff} onClose={() => setSignOff(false)} title={t('Publish lesson')} initial={reviewed ? { by: en.reviewed_by, on: en.reviewed_on } : undefined}
        onConfirm={async (by, on) => { await persist(); await publishLesson(lesson.id, by, on); toast(publishedTo(meta.channels.map((c) => (c === 'web' ? 'the website' : 'the app')).join(' and '))); onChanged(); }} />
    </>
  );
}

/** Looks like the app's lesson screen, at phone width. */
function LessonPreview({ title, steps, pics, uploaded }: { title: string; steps: string[]; pics: string[]; uploaded: Map<string, string> }) {
  const t = useT();
  return (
    <article className="mx-auto max-w-[22rem] overflow-hidden rounded-xl border-8 border-ink bg-bg shadow-raised">
      <div className="bg-primary px-4 pb-4 pt-6 text-white"><p className="text-caption font-semibold">{t('Learn')}</p><h3 className="font-display text-h3 font-extrabold">{title || t('Untitled')}</h3></div>
      <ol className="flex max-h-[34rem] flex-col gap-3 overflow-y-auto p-3">
        {steps.map((s, i) => (
          <li key={i} className="rounded-lg bg-surface p-3 shadow-card">
            {pics[i] && <AppPictureThumb id={pics[i]} version={uploaded.get(pics[i])} className="mb-2 aspect-[4/3]" />}
            <div className="flex gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-caption font-bold text-primary" aria-hidden>{i + 1}</span>
              <p className="min-w-0 text-small text-ink">{s || <span className="text-ink-2">{t('No text yet')}</span>}</p>
            </div>
          </li>
        ))}
        {!steps.length && <li className="t-small p-3">{t('Add a step to see it here.')}</li>}
      </ol>
    </article>
  );
}

function NewLesson({ open, onClose, onCreated, taken }: { open: boolean; onClose: () => void; onCreated: (id: string) => void; taken: string[] }) {
  const [f, setF] = useState({ id: '', category: 'preg', format: 'guide', minutes: '3', stage: 'pregnant' });
  const [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const t = useT();
  useEffect(() => { if (open) { setF({ id: '', category: 'preg', format: 'guide', minutes: '3', stage: 'pregnant' }); setErr(null); } }, [open]);
  const okId = /^[a-z0-9][a-z0-9-]{1,40}$/.test(f.id) && !taken.includes(f.id);
  return (
    <Modal open={open} onClose={onClose} title={t('New lesson')} description={t('Starts as a draft. Nothing reaches mothers until it is published with clinical sign-off.')}
      footer={<><Button variant="outline" onClick={onClose}>{t('Cancel')}</Button><Button icon={Plus} loading={busy} disabled={!okId} onClick={async () => {
        setBusy(true); setErr(null);
        try { await createLesson({ id: f.id, category: f.category as Lesson['category'], format: f.format as Lesson['format'], minutes: Number(f.minutes) || null, stage: f.stage as Lesson['stage'] }); onCreated(f.id); onClose(); }
        catch (e) { setErr((e as Error).message); }
        setBusy(false);
      }}>{t('Create draft')}</Button></>}>
      <div className="grid gap-4">
        <FormField label={t('Lesson ID')} required hint={t('Lower-case letters, digits and dashes, for example sleep-safe. Used in the website address.')} error={f.id && !okId ? (taken.includes(f.id) ? t('That ID is taken') : t('Use lower-case letters, digits and dashes')) : undefined}>
          <TextInput value={f.id} onChange={(e) => setF({ ...f, id: e.target.value.toLowerCase() })} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('Category')}><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.entries(CAT).map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}</Select></FormField>
          <FormField label={t('Stage')}><Select value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })}><option value="pregnant">{t('Pregnancy')}</option><option value="baby">{t('Baby')}</option><option value="both">{t('Both')}</option></Select></FormField>
        </div>
        {err && <p role="alert" className="text-small font-semibold text-danger">{err}</p>}
      </div>
    </Modal>
  );
}

export default function LessonsPage() {
  const { data, loading, error, reload } = useAsync(loadLessons, []);
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'retired' | 'pending'>('all');
  const [adding, setAdding] = useState(false);
  const list = useMemo(() => (data ?? []).filter((l) => filter === 'all' || (filter === 'pending' ? l.lesson_translations.some((x) => !x.reviewed_by) : l.status === filter)), [data, filter]);
  const lesson = data?.find((l) => l.id === sel);
  const t = useT();

  if (loading) return <LoadingState text={t('Loading lessons…')} />;
  if (error || !data) return <ErrorState text={error ?? ''} onRetry={() => reload()} />;
  if (lesson) return <Editor lesson={lesson} onBack={() => setSel(null)} onChanged={() => reload(true)} />;
  const count = (f: typeof filter) => data.filter((l) => f === 'all' || (f === 'pending' ? l.lesson_translations.some((x) => !x.reviewed_by) : l.status === f)).length;

  return (
    <>
      <PageHeader title={t('Lessons')} subtitle={t("One library for the website and the app. Each lesson chooses where it appears. Publishing needs both languages and clinical sign-off; a live lesson's text is locked until it is unpublished.")}
        actions={<Button icon={Plus} onClick={() => setAdding(true)}>{t('New lesson')}</Button>} />
      <div className="mb-4"><Chips label={t('Show lessons')} value={filter} onChange={setFilter} options={[{ value: 'all', label: t('All'), count: count('all') }, { value: 'published', label: t('Published'), count: count('published') }, { value: 'draft', label: t('Drafts'), count: count('draft') }, { value: 'pending', label: t('Pending review'), count: count('pending') }, { value: 'retired', label: t('Retired'), count: count('retired') }]} /></div>
      <BaseCard padded={false}>
        {list.length === 0 ? <EmptyState icon={BookOpen} title={t('No lessons here')} /> : (
          <ul className="divide-y divide-line">
            {list.map((l) => {
              const en = trOf(l, 'en'), sw = trOf(l, 'sw');
              return (
                <li key={l.id}>
                  <button type="button" onClick={() => setSel(l.id)} className="flex w-full min-w-0 flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-surface-2">
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{en.title || l.id}</span><span className="t-small block truncate">{sw.title || t('No Kiswahili yet')} · {t(CAT[l.category])} · {t('{n} steps', { n: Math.max(en.steps.length, sw.steps.length) })} · {t('{n} pictures', { n: l.step_pictures.filter(Boolean).length })} · v{l.version}</span></span>
                    <span className="flex flex-wrap gap-2">
                      <StateBadge status={l.status} />
                      {l.channels.includes('web') && <StatusBadge icon={Globe}>{t('Web')}</StatusBadge>}{l.channels.includes('app') && <StatusBadge icon={Smartphone}>{t('App')}</StatusBadge>}
                      {(!en.reviewed_by || !sw.reviewed_by) && <StatusBadge tone="warning">{t('Pending clinical review')}</StatusBadge>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </BaseCard>
      <NewLesson open={adding} onClose={() => setAdding(false)} taken={data.map((l) => l.id)} onCreated={async (id) => { await reload(true); setSel(id); }} />
    </>
  );
}
