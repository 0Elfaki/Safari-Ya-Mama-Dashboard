import { Archive, CheckCircle2, Download, Inbox, Mail, Reply } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { Chips, useToast } from '@/components/ui/Bits';
import { Button, ButtonLink } from '@/components/ui/Button';
import { BaseCard } from '@/components/ui/Card';
import { FormField, TextArea } from '@/components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { messages, setMessageStatus, type Message } from '@/lib/cms';
import { downloadCsv, toCsv } from '@/lib/csv';
import { fmtDateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';
import { msg, useT } from '@/lib/i18n';

const TONE = { new: 'warning', replied: 'success', archived: 'neutral' } as const;
const LABEL = { new: msg('New'), replied: msg('Replied'), archived: msg('Archived') } as const;

function MessageCard({ m, onChanged }: { m: Message; onChanged: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState(m.note ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const t = useT();
  const set = async (status: Message['status']) => {
    setBusy(status);
    try { await setMessageStatus(m.id, status, note.trim() || null); toast({ new: t('Marked new'), replied: t('Marked replied'), archived: t('Marked archived') }[status]); onChanged(); } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };
  return (
    <BaseCard as="article">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="t-h3">{m.name}{m.organisation ? <span className="font-body text-small font-semibold text-ink-2"> · {m.organisation}</span> : null}</h2>
          <p className="t-small">{m.email} · {m.topic ?? t('No topic')} · {fmtDateTime(m.created_at)}</p>
        </div>
        <StatusBadge tone={TONE[m.status]}>{t(LABEL[m.status])}</StatusBadge>
      </div>
      <p className="mt-4 whitespace-pre-line text-body text-ink">{m.message}</p>
      <FormField className="mt-4" label={t('Team note (not sent)')}><TextArea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink to={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message to Safari ya Mama')}`} variant="outline" size="sm" icon={Reply}>{t('Reply by email')}</ButtonLink>
        {m.status !== 'replied' && <Button size="sm" variant="outline" icon={CheckCircle2} loading={busy === 'replied'} onClick={() => set('replied')}>{t('Mark replied')}</Button>}
        {m.status !== 'archived' && <Button size="sm" variant="ghost" icon={Archive} loading={busy === 'archived'} onClick={() => set('archived')}>{t('Archive')}</Button>}
        {m.status === 'archived' && <Button size="sm" variant="ghost" icon={Mail} loading={busy === 'new'} onClick={() => set('new')}>{t('Back to new')}</Button>}
      </div>
    </BaseCard>
  );
}

export default function InboxPage() {
  const s = useSession();
  const { data, loading, error, reload } = useAsync(messages, []);
  const [show, setShow] = useState<Message['status']>('new');
  const t = useT();
  const all = data ?? [];
  const list = all.filter((m) => m.status === show);
  return (
    <>
      <PageHeader title={t('Inbox')} subtitle={t("Messages from the website's contact form. They contain people's names and emails: reply, then archive. They are never copied into logs or version history.")}
        actions={s.can('admin') ? <Button variant="outline" icon={Download} disabled={!all.length} onClick={() => downloadCsv(`contact-messages-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(all.map(({ id, ...m }) => { void id; return m; }) as unknown as Record<string, unknown>[]))}>{t('Export CSV')}</Button> : undefined} />
      <div className="mb-4"><Chips label={t('Show messages')} value={show} onChange={setShow} options={(['new', 'replied', 'archived'] as const).map((x) => ({ value: x, label: t(LABEL[x]), count: all.filter((m) => m.status === x).length }))} /></div>
      {loading ? <LoadingState text={t('Loading messages…')} /> : error ? <ErrorState text={error} onRetry={() => reload()} /> : list.length === 0 ? (
        <BaseCard><EmptyState icon={Inbox} title={show === 'new' ? t('No new messages') : show === 'replied' ? t('No replied messages') : t('No archived messages')} text={show === 'new' ? t('Messages sent from the website contact form appear here.') : undefined} /></BaseCard>
      ) : <div className="grid gap-4">{list.map((m) => <MessageCard key={m.id} m={m} onChanged={() => reload(true)} />)}</div>}
    </>
  );
}
