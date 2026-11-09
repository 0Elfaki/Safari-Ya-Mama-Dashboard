import { Archive, Bot, Eye, EyeOff, FlaskConical, Pencil, Plus, Save, Settings2, ShieldAlert, Stethoscope, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { Chips, Tabs, useTab, useToast } from '@/components/ui/Bits';
import { Button, IconButton } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { FormField, Select, TextArea, TextInput, Toggle } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  archiveMamaEntry, archiveSafetyPhrase, mamaEntries, matchQuestion, publishMamaEntry, publishSafetyPhrase, reviewMamaEntry, safetyPhrases, saveMamaEntry,
  saveSafetyPhrase, type MamaEntry,
} from '@/lib/care';
import { saveSetting, settings as loadSettings } from '@/lib/cms';
import { fmtDate } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';
import { msg, useT, useTn } from '@/lib/i18n';

const URG = { red: ['danger', msg('Red · go now')], yellow: ['warning', msg('Yellow · see a health worker today')], none: ['neutral', msg('No urgency')] } as const;
// the server compares this exact text (patterns|en|sw|urgency) with what the reviewer approved
const reviewed = (e: MamaEntry) => !!e.reviewed_by && !!e.review_hash;

type Form = { id: string | null; patterns: string[]; answer_en: string; answer_sw: string; urgency: 'red' | 'yellow' | 'none'; lesson: string; reference: string };

function EntryEditor({ value, onClose, onSaved }: { value: Form | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const t = useT();
  const [f, setF] = useState<Form | null>(value);
  const [pat, setPat] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setF(value); setPat(''); }, [value]);
  if (!f) return null;
  const add = () => { const p = pat.trim().toLowerCase(); if (p.length >= 2 && !f.patterns.includes(p)) setF({ ...f, patterns: [...f.patterns, p] }); setPat(''); };
  return (
    <Modal open onClose={onClose} title={f.id ? t('Edit answer') : t('New answer')} wide description={t('Saving a change takes the answer off the website until a clinical reviewer approves the new text.')}
      footer={<><Button variant="outline" onClick={onClose}>{t('Cancel')}</Button><Button icon={Save} loading={busy} disabled={!f.patterns.length || !f.answer_en.trim()} onClick={async () => {
        setBusy(true);
        try { await saveMamaEntry(f); toast(t('Answer saved. It needs clinical review before it is published.')); onSaved(); onClose(); } catch (e) { toast((e as Error).message, 'bad'); }
        setBusy(false);
      }}>{t('Save')}</Button></>}>
      <div className="grid gap-4">
        <div>
          <FormField label={t('Question patterns')} hint={t('Words or short phrases a question must contain, for example “swollen feet” or “miguu kuvimba”. More matching patterns = better match.')}>
            <div className="flex gap-2"><TextInput value={pat} onChange={(e) => setPat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} /><Button variant="outline" icon={Plus} onClick={add}>{t('Add')}</Button></div>
          </FormField>
          <ul className="mt-2 flex flex-wrap gap-2">{f.patterns.map((p) => (
            <li key={p} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 pl-3 text-small text-ink">{p}
              <IconButton icon={X} label={t('Remove {name}', { name: p })} onClick={() => setF({ ...f, patterns: f.patterns.filter((x) => x !== p) })} /></li>
          ))}</ul>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label={t('Answer · English')} required hint={`${f.answer_en.length}/2000`}><TextArea rows={6} maxLength={2000} value={f.answer_en} onChange={(e) => setF({ ...f, answer_en: e.target.value })} /></FormField>
          <FormField label="Jibu · Kiswahili" required hint={`${f.answer_sw.length}/2000`}><TextArea rows={6} maxLength={2000} value={f.answer_sw} onChange={(e) => setF({ ...f, answer_sw: e.target.value })} /></FormField>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label={t('Urgency')} hint={t('Decided by the approved rules, not by MamaBot.')}><Select value={f.urgency} onChange={(e) => setF({ ...f, urgency: e.target.value as Form['urgency'] })}>
            <option value="none">{t('No urgency')}</option><option value="yellow">{t('Yellow · see a health worker today')}</option><option value="red">{t('Red · go now')}</option></Select></FormField>
          <FormField label={t('Source lesson (id)')} hint={t('For example danger-preg')}><TextInput value={f.lesson} onChange={(e) => setF({ ...f, lesson: e.target.value })} /></FormField>
          <FormField label={t('Reference')} hint={t('Guideline or source')}><TextInput maxLength={300} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></FormField>
        </div>
      </div>
    </Modal>
  );
}

function AnswersTab() {
  const s = useSession();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(mamaEntries, []);
  const [edit, setEdit] = useState<Form | null>(null);
  const [rev, setRev] = useState<MamaEntry | null>(null);
  const [by, setBy] = useState('');
  const t = useT();
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); reload(true); } catch (e) { toast((e as Error).message, 'bad'); } };
  if (loading) return <LoadingState text={t('Loading answers…')} />;
  if (error) return <ErrorState text={error} onRetry={() => reload()} />;
  const list = data ?? [];
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="t-small max-w-prose">{t("Reviewed answers the website's MamaBot gives. MamaBot explains; it never diagnoses. Each answer goes live only after a clinical reviewer approves its exact text.")}</p>
        {s.can('edit') && <Button icon={Plus} onClick={() => setEdit({ id: null, patterns: [], answer_en: '', answer_sw: '', urgency: 'none', lesson: '', reference: '' })}>{t('New answer')}</Button>}
      </div>
      <BaseCard>
        {list.length === 0 ? <EmptyState icon={Bot} title={t('No answers yet')} text={t('While the library is empty the website keeps its built-in answers.')} /> : (
          <ul className="divide-y divide-line">
            {list.map((e) => (
              <li key={e.id} className="grid gap-2 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={URG[e.urgency][0]}>{t(URG[e.urgency][1])}</StatusBadge>
                  {e.published ? <StatusBadge tone="success" icon={Eye}>{t('On the website')}</StatusBadge> : <StatusBadge icon={EyeOff}>{t('Not shown')}</StatusBadge>}
                  {reviewed(e) ? <StatusBadge tone="success" icon={Stethoscope}>{t('Clinically reviewed')}</StatusBadge> : <StatusBadge tone="warning">{t('Pending clinical review')}</StatusBadge>}
                </div>
                <p className="break-words text-small font-semibold text-ink">{e.patterns.join(' · ')}</p>
                {reviewed(e) && <p className="t-caption">{t('Reviewed by {name}', { name: e.reviewed_by ?? '' })} · {fmtDate(e.reviewed_on)}</p>}
                <p className="t-small">{e.answer_en.slice(0, 220)}{e.answer_en.length > 220 ? '…' : ''}</p>
                <div className="flex flex-wrap gap-1">
                  {s.can('edit') && <Button size="sm" variant="outline" icon={Pencil} onClick={() => setEdit({ id: e.id, patterns: e.patterns, answer_en: e.answer_en, answer_sw: e.answer_sw, urgency: e.urgency, lesson: e.source_lesson_id ?? '', reference: e.reference ?? '' })}>{t('Edit')}</Button>}
                  {s.can('review') && <Button size="sm" variant="outline" icon={Stethoscope} onClick={() => { setBy(''); setRev(e); }}>{t('Approve this text')}</Button>}
                  {s.can('edit') && <Button size="sm" variant="ghost" icon={e.published ? EyeOff : Eye} onClick={() => run(() => publishMamaEntry(e.id, !e.published), e.published ? t('Taken off the website') : t('Published'))}>{e.published ? t('Unpublish') : t('Publish')}</Button>}
                  {s.can('edit') && <Button size="sm" variant="ghost" icon={Archive} onClick={() => { if (confirm(t('Archive this answer?'))) run(() => archiveMamaEntry(e.id), t('Archived')); }}>{t('Archive')}</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </BaseCard>
      <EntryEditor value={edit} onClose={() => setEdit(null)} onSaved={() => reload(true)} />
      {rev && (
        <Modal open onClose={() => setRev(null)} title={t('Approve this answer')} description={t('Your approval covers exactly this text. Any later change needs a new review.')}
          footer={<><Button variant="outline" onClick={() => setRev(null)}>{t('Cancel')}</Button><Button icon={Stethoscope} disabled={s.role !== 'clinical_reviewer' && by.trim().length < 3}
            onClick={async () => { await run(() => reviewMamaEntry(rev.id, s.role === 'clinical_reviewer' ? null : by.trim()), t('Approved')); setRev(null); }}>{t('Approve')}</Button></>}>
          <div className="grid gap-3">
            <p className="text-small text-ink"><b>{t('English:')}</b> {rev.answer_en}</p>
            <p className="text-small text-ink"><b>{t('Kiswahili:')}</b> {rev.answer_sw}</p>
            {s.role !== 'clinical_reviewer' && <FormField label={t('Reviewed by (role and cadre)')} required hint={t('For example: Registered midwife, Sample District.')}><TextInput value={by} onChange={(e) => setBy(e.target.value)} /></FormField>}
          </div>
        </Modal>
      )}
    </>
  );
}

function SafetyTab() {
  const s = useSession();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(safetyPhrases, []);
  const [f, setF] = useState({ phrase: '', lang: 'en', urgency: 'red' });
  const can = s.can('review');
  const t = useT();
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); reload(true); } catch (e) { toast((e as Error).message, 'bad'); } };
  if (loading) return <LoadingState text={t('Loading phrases…')} />;
  if (error) return <ErrorState text={error} onRetry={() => reload()} />;
  return (
    <>
      <p className="t-small mb-4 max-w-prose">{t("Words that make the website's MamaBot skip everything else and show emergency guidance at once. Only Admins and clinical reviewers can change them. The mother app has its own list, set in code (see Mobile app › Clinical rules).")}</p>
      {can && (
        <BaseCard className="mb-4">
          <form className="grid items-end gap-3 md:grid-cols-[1fr_10rem_14rem_auto]" onSubmit={async (e) => { e.preventDefault(); await run(() => saveSafetyPhrase({ id: null, ...f }), t('Phrase added (publish it to make it live)')); setF({ ...f, phrase: '' }); }}>
            <FormField label={t('Phrase')}><TextInput value={f.phrase} onChange={(e) => setF({ ...f, phrase: e.target.value })} /></FormField>
            <FormField label={t('Language')}><Select value={f.lang} onChange={(e) => setF({ ...f, lang: e.target.value })}><option value="en">{t('English')}</option><option value="sw">{t('Kiswahili')}</option></Select></FormField>
            <FormField label={t('Urgency')}><Select value={f.urgency} onChange={(e) => setF({ ...f, urgency: e.target.value })}><option value="red">{t('Red · go now')}</option><option value="yellow">{t('Yellow · today')}</option></Select></FormField>
            <Button type="submit" icon={Plus} disabled={f.phrase.trim().length < 2}>{t('Add')}</Button>
          </form>
        </BaseCard>
      )}
      <BaseCard>
        {(data ?? []).length === 0 ? <EmptyState icon={ShieldAlert} title={t('No safety phrases yet')} text={t('The website keeps its built-in urgent words until phrases are published here.')} /> : (
          <ul className="divide-y divide-line">
            {(data ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="min-w-0 flex-1 font-semibold text-ink">{p.phrase} <span className="t-caption">({p.lang === 'en' ? t('English') : t('Kiswahili')})</span></span>
                <StatusBadge tone={p.urgency === 'red' ? 'danger' : 'warning'}>{p.urgency === 'red' ? t('Red') : t('Yellow')}</StatusBadge>
                {p.published ? <StatusBadge tone="success">{t('Live')}</StatusBadge> : <StatusBadge>{t('Not live')}</StatusBadge>}
                {can && <span className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => run(() => publishSafetyPhrase(p.id, !p.published), p.published ? t('Taken off') : t('Live'))}>{p.published ? t('Unpublish') : t('Publish')}</Button>
                  <Button size="sm" variant="ghost" icon={Archive} onClick={() => run(() => archiveSafetyPhrase(p.id), t('Archived'))}>{t('Archive')}</Button>
                </span>}
              </li>
            ))}
          </ul>
        )}
      </BaseCard>
    </>
  );
}

function TestTab() {
  const { data, loading } = useAsync(async () => ({ e: await mamaEntries(), s: await safetyPhrases() }), []);
  const [q, setQ] = useState('');
  const [onlyLive, setOnlyLive] = useState<'live' | 'all'>('live');
  const t = useT(), tn = useTn();
  if (loading || !data) return <LoadingState text={t('Loading…')} />;
  const entries = data.e.filter((e) => onlyLive === 'all' || e.published), safety = data.s.filter((x) => onlyLive === 'all' || x.published);
  const r = q.trim() ? matchQuestion(q, entries, safety) : null;
  const entry = r?.kind === 'entry' ? data.e.find((e) => e.id === r.id) : null;
  return (
    <BaseCard>
      <CardHeader icon={FlaskConical} title={t('Test a question')} subtitle={t('Uses the same rule as the website: a safety phrase wins; otherwise the answer with the most matching patterns.')} />
      <div className="mb-3"><Chips label={t('Use')} value={onlyLive} onChange={setOnlyLive} options={[{ value: 'live', label: t('Live answers only') }, { value: 'all', label: t('Include drafts') }]} /></div>
      <FormField label={t("A mother's question")}><TextInput value={q} placeholder={t('My feet are swollen, is that normal?')} onChange={(e) => setQ(e.target.value)} /></FormField>
      {r && (
        <div role="status" className="mt-4 rounded-md border border-line bg-surface-2 p-4">
          {r.kind === 'safety' && <p className="text-small text-ink">{r.urgency === 'red'
            ? tn('{phrase} matched: MamaBot shows go-now emergency guidance and nothing else.', { phrase: <b>{t('Safety phrase “{phrase}”', { phrase: r.phrase })}</b> })
            : tn('{phrase} matched: MamaBot shows see-a-health-worker-today emergency guidance and nothing else.', { phrase: <b>{t('Safety phrase “{phrase}”', { phrase: r.phrase })}</b> })}</p>}
          {r.kind === 'entry' && entry && <>
            <p className="text-small text-ink">{r.score > 1
              ? tn('{matched} {n} patterns: {list}', { matched: <b>{t('Matched')}</b>, n: r.score, list: r.matched.join(', ') })
              : tn('{matched} {n} pattern: {list}', { matched: <b>{t('Matched')}</b>, n: r.score, list: r.matched.join(', ') })}</p>
            <p className="mt-2 text-small text-ink">{entry.answer_en}</p>
            {!entry.published && <p className="t-caption mt-1">{t('This answer is not live yet.')}</p>}
          </>}
          {r.kind === 'none' && <p className="text-small text-ink">{t('No answer in the library matches. The website uses its built-in behaviour.')}</p>}
        </div>
      )}
    </BaseCard>
  );
}

function SettingsTab() {
  const s = useSession();
  const toast = useToast();
  const { data, reload } = useAsync(loadSettings, []);
  const cur = data?.find((x) => x.key === 'mamabot');
  const [v, setV] = useState({ ai_enabled: true, model: '', temperature: 0.2 });
  useEffect(() => { const d = (cur?.draft && Object.keys(cur.draft).length ? cur.draft : cur?.value) as Partial<typeof v> | undefined; if (d) setV((x) => ({ ...x, ...d })); }, [cur?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  const can = s.can('admin');
  const t = useT();
  return (
    <BaseCard>
      <CardHeader icon={Settings2} title={t('AI settings')} subtitle={t('The provider key lives only in Edge Function secrets and is never named on the website. Admins only.')} />
      <div className="grid max-w-prose gap-4">
        <Toggle label={t('Let MamaBot ask the AI')} description={t('Off: the website answers only from the reviewed library and its built-in answers.')} checked={v.ai_enabled} onChange={(x) => can && setV({ ...v, ai_enabled: x })} />
        <FormField label={t('Model')} hint={t('Leave empty for the default.')}><TextInput value={v.model} disabled={!can} onChange={(e) => setV({ ...v, model: e.target.value })} /></FormField>
        <FormField label={t('Temperature')} hint={t('0 = most predictable. Keep it low for health answers.')}><TextInput type="number" min={0} max={1} step={0.1} value={String(v.temperature)} disabled={!can} onChange={(e) => setV({ ...v, temperature: Math.min(1, Math.max(0, Number(e.target.value) || 0)) })} /></FormField>
        {can && <Button icon={Save} className="justify-self-start" onClick={async () => { try { await saveSetting('mamabot', v, true); toast(t('Saved and live')); reload(true); } catch (e) { toast((e as Error).message, 'bad'); } }}>{t('Save and publish')}</Button>}
      </div>
    </BaseCard>
  );
}

const TABS = ['answers', 'safety', 'test', 'settings'] as const;
export default function MamaBotPage() {
  const [tab, setTab] = useTab(TABS, 'answers');
  const t = useT();
  return (
    <>
      <PageHeader title={t('MamaBot (website)')} subtitle={t("The answer library and safety phrases of the website's MamaBot. The mother app's MamaBot rules are separate and set in code.")} />
      <Tabs label="MamaBot" value={tab} onChange={setTab} tabs={[{ value: 'answers', label: t('Answers'), icon: Bot }, { value: 'safety', label: t('Safety phrases'), icon: ShieldAlert }, { value: 'test', label: t('Test a question'), icon: FlaskConical }, { value: 'settings', label: t('AI settings'), icon: Settings2 }]} />
      {tab === 'answers' ? <AnswersTab /> : tab === 'safety' ? <SafetyTab /> : tab === 'test' ? <TestTab /> : <SettingsTab />}
    </>
  );
}
