import { Ban, CheckCircle2, EyeOff, MessageSquarePlus, MessagesSquare, Siren, Stethoscope, Trash2, UserX } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { useToast } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { BaseCard } from '@/components/ui/Card';
import { FormField, TextArea } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { StatusBadge } from '@/components/ui/StatusBadge';
import ref from '@/data/clinical-reference.json';
import { moderate, replyAsStaff, reviewQueue, type CirclePost, type ModAction } from '@/lib/care';
import { ago } from '@/lib/format';
import { msg, tr, useLang, useTn } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';

/** Checked facts from the bilingual clinical reference (shown in the interface language). */
const FACTS = Object.fromEntries(ref.circle.myths.map((m) => [m.id, m.fact]));
/** Why a post is waiting, in plain words. */
function reason(r: string): string {
  if (r === 'urgent') return tr('Mentions a danger sign');
  if (r === 'new') return tr('New member (first posts are checked)');
  if (r === 'strikes') return tr('Member with earlier removed posts');
  if (r === 'selling') return tr('Looks like selling or a link');
  if (r === 'miracle') return tr('Promises a miracle cure');
  if (r === 'privacy') return tr('Had a phone number or email (removed)');
  if (r === 'unchecked-medical') return tr('Talks about medicines; the AI check was not available');
  if (r.startsWith('myth:')) return tr('States a myth as fact: {id}', { id: r.slice(5) });
  if (r.startsWith('fact:')) return tr('Asks about a myth (the checked fact is shown): {id}', { id: r.slice(5) });
  if (r.startsWith('ai:')) return tr('The AI check thinks it may be {label}', { label: r.slice(3) });
  return r;
}
const REPORT = { wrong: msg('wrong information'), unkind: msg('unkind'), selling: msg('selling'), private: msg('private details'), other: msg('other') } as Record<string, string>;
const TOPIC: Record<string, string> = { pregnancy: msg('Pregnancy'), birth: msg('Birth'), feeding: msg('Feeding'), baby: msg('Baby'), feelings: msg('Feelings'), other: msg('Other') };

function PostCard({ p, onDone }: { p: CirclePost; onDone: () => void }) {
  const toast = useToast();
  const { t, lang } = useLang();
  const tn = useTn();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<null | 'note' | 'reply'>(null);
  const [text, setText] = useState('');
  const act = async (a: ModAction, n: string | null, ok: string) => {
    setBusy(a);
    try { await moderate(p.id, a, n); toast(ok); onDone(); } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };
  return (
    <BaseCard as="article" className={p.urgent ? 'border-danger/40' : undefined}>
      <div className="flex flex-wrap items-center gap-2">
        {p.urgent && <StatusBadge tone="danger" icon={Siren}>{t('Urgent: check first')}</StatusBadge>}
        <StatusBadge tone={p.status === 'hidden' ? 'warning' : 'neutral'}>{p.status === 'hidden' ? t('Hidden by {n} reports', { n: p.report_count }) : t('Waiting for review')}</StatusBadge>
        <StatusBadge>{TOPIC[p.topic] ? t(TOPIC[p.topic]) : p.topic}</StatusBadge>
        {p.parent_id && <StatusBadge>{t('Reply')}</StatusBadge>}
        <span className="t-caption">{ago(p.created_at)} · {p.anonymous ? t('Anonymous mother') : p.author_name ?? t('Member')}{p.stage_kind ? ` · ${p.stage_kind === 'pregnant' ? t('{n} weeks pregnant', { n: String(p.stage_value) }) : t('baby {n} months', { n: String(p.stage_value) })}` : ''}{p.author_strikes ? ` · ${p.author_strikes > 1 ? t('{n} earlier strikes', { n: p.author_strikes }) : t('{n} earlier strike', { n: p.author_strikes })}` : ''}</span>
      </div>
      {p.parent_body && <p className="t-small mt-3 border-l-4 border-line pl-3">{t('Replying to: “{text}”', { text: `${p.parent_body.slice(0, 160)}${p.parent_body.length > 160 ? '…' : ''}` })}</p>}
      <p className="mt-3 whitespace-pre-line text-body text-ink">{p.body}</p>
      <ul className="mt-3 flex flex-col gap-1">
        {p.reasons.map((r) => <li key={r} className="t-small flex items-start gap-2"><span aria-hidden>•</span>{reason(r)}</li>)}
        {p.ai && <li className="t-small flex items-start gap-2"><span aria-hidden>•</span>{t('AI check: {label} ({pct}%): {why}', { label: p.ai.label, pct: Math.round(p.ai.confidence * 100), why: p.ai.why })}</li>}
        {p.reports.length > 0 && <li className="t-small flex items-start gap-2"><span aria-hidden>•</span>{t('Reported as: {list}', { list: p.reports.map((r) => (REPORT[r] ? t(REPORT[r]) : r)).join(', ') })}</li>}
      </ul>
      {p.facts.filter((f) => FACTS[f]).map((f) => <p key={f} className="mt-3 rounded-md bg-primary-soft px-3 py-2 text-small text-ink">{tn('{label} {fact}', { label: <b>{t('Checked fact shown with it:')}</b>, fact: lang === 'sw' ? FACTS[f].sw || FACTS[f].en : FACTS[f].en })}</p>)}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" icon={CheckCircle2} loading={busy === 'publish'} onClick={() => act('publish', null, t('Published'))}>{t('Publish')}</Button>
        <Button size="sm" variant="outline" icon={Stethoscope} onClick={() => { setText(p.health_note ?? ''); setNote('note'); }}>{t('Publish with a note')}</Button>
        {!p.parent_id && <Button size="sm" variant="outline" icon={MessageSquarePlus} onClick={() => { setText(''); setNote('reply'); }}>{t('Reply as health worker')}</Button>}
        <Button size="sm" variant="ghost" icon={EyeOff} loading={busy === 'hide'} onClick={() => act('hide', null, t('Hidden'))}>{t('Hide')}</Button>
        <Button size="sm" variant="ghost" icon={Trash2} loading={busy === 'remove'} onClick={() => act('remove', null, t('Removed'))}>{t('Remove')}</Button>
        <Button size="sm" variant="ghost" icon={Ban} loading={busy === 'remove_strike'} onClick={() => { if (confirm(t('Remove as misinformation or abuse? It counts as a strike: 2 strikes send her posts to review for 30 days, 4 stop her posting for 30 days.'))) act('remove_strike', null, t('Removed with a strike')); }}>{t('Remove with a strike')}</Button>
        {!p.anonymous && p.author_has_name && <Button size="sm" variant="ghost" icon={UserX} loading={busy === 'reset_name'} onClick={() => { if (confirm(t('Clear her community name? She must choose another one.'))) act('reset_name', null, t('Name cleared')); }}>{t('Name not acceptable')}</Button>}
      </div>
      <Modal open={!!note} onClose={() => setNote(null)} title={note === 'note' ? t('Publish with a health worker note') : t('Reply as a health worker')}
        description={note === 'note' ? t('Your note is shown under the post. Up to 600 characters.') : t('Your reply is published at once with a health worker badge and your first name.')}
        footer={<><Button variant="outline" onClick={() => setNote(null)}>{t('Cancel')}</Button><Button loading={busy === 'n'} disabled={text.trim().length < 2} onClick={async () => {
          if (note === 'note') { await act('note', text.trim(), t('Published with your note')); setNote(null); return; }
          setBusy('n');
          const r = await replyAsStaff(p.id, text.trim());
          setBusy(null);
          if (r.error) toast(r.error, 'bad'); else { toast(p.status === 'published' ? t('Reply posted') : t('Reply saved; it shows when the post is published')); setNote(null); onDone(); }
        }}>{note === 'note' ? t('Publish') : t('Post reply')}</Button></>}>
        <FormField label={note === 'note' ? t('Note') : t('Reply')} hint={`${text.length}/${note === 'note' ? 600 : 1000}`}><TextArea rows={5} maxLength={note === 'note' ? 600 : 1000} value={text} onChange={(e) => setText(e.target.value)} /></FormField>
      </Modal>
    </BaseCard>
  );
}

export default function CirclePage() {
  const { data, loading, error, reload } = useAsync(reviewQueue, []);
  const { t } = useLang();
  const list = [...(data ?? [])].sort((a, b) => Number(b.urgent) - Number(a.urgent) || (a.created_at < b.created_at ? -1 : 1));
  return (
    <>
      <PageHeader title={t("Mothers' circle")} subtitle={t('Posts waiting for a health worker, urgent first. Mothers see a post only after it is published. Who wrote it is never shown, only the name she chose (or anonymous).')} />
      {loading ? <LoadingState text={t('Loading the review queue…')} /> : error ? <ErrorState text={error} onRetry={() => reload()} /> : list.length === 0 ? (
        <BaseCard><EmptyState icon={MessagesSquare} title={t('Nothing is waiting')} text={t('New posts that need a health worker appear here: danger signs, myths, new members, reported posts.')} /></BaseCard>
      ) : (
        <>
          <p className="t-small mb-4">{t('{n} waiting · {u} urgent', { n: list.length, u: list.filter((p) => p.urgent).length })}</p>
          <div className="grid gap-4">{list.map((p) => <PostCard key={p.id} p={p} onDone={() => reload(true)} />)}</div>
        </>
      )}
    </>
  );
}
