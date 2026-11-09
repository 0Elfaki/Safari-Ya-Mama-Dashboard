import clsx from 'clsx';
import { CheckCircle2, Clock, HeartPulse, Phone, PhoneCall, Send, Siren, UserCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/Shell';
import { Chips, LevelBadge, useToast } from '@/components/ui/Bits';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { BaseCard } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { FormField, Select, TextArea } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { alertActions, alerts as loadAlerts, assignAlert, people, setAlertStatus } from '@/lib/api';
import { fmtDateTime, LV, signLabel, waited } from '@/lib/format';
import { msg, useT, useTn } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { Alert, AlertStatus } from '@/lib/types';
import { useAsync } from '@/lib/useAsync';

type Filter = 'action' | 'open' | 'progress' | 'closed' | 'all';
const STATUS: Record<AlertStatus, string> = { open: msg('Open'), acknowledged: msg('Acknowledged'), contacted: msg('Called'), referred: msg('Advised to go'), closed: msg('Closed') };
const ACTION: Record<string, string> = { acknowledged: msg('Acknowledged'), called: msg('Called her'), visited: msg('Visited'), advised_facility: msg('Advised to go to the facility'), referred: msg('Advised to go to the facility'), closed: msg('Closed'), note: msg('Note') };
const inFilter = (a: Alert, f: Filter) =>
  f === 'all' ? true : f === 'closed' ? a.status === 'closed' : f === 'open' ? a.status === 'open' : f === 'progress' ? ['acknowledged', 'contacted', 'referred'].includes(a.status) : a.status !== 'closed';

function Detail({ a, onClose, onChanged }: { a: Alert; onClose: () => void; onChanged: () => void }) {
  const { isFacilityAdmin, facility } = useSession();
  const toast = useToast();
  const t = useT(), tn = useTn();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const hist = useAsync(() => alertActions(a.id), [a.id, a.status, a.assigned_to]);
  const team = useAsync(() => (isFacilityAdmin ? people(facility!.id) : Promise.resolve([])), [isFacilityAdmin, facility?.id]);
  const red = a.level === 'red', late = red && a.status === 'open' && Date.now() - new Date(a.created_at).getTime() > 30 * 6e4;

  const act = async (status: AlertStatus) => {
    setBusy(status);
    try {
      await setAlertStatus(a.id, status, note.trim() || null);
      toast({ acknowledged: t('Acknowledged'), contacted: t('Call recorded'), referred: t('Recorded: advised to go'), closed: t('Alert closed'), open: t('Updated') }[status]);
      setNote(''); onChanged();
    } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };

  return (
    <BaseCard as="section" aria-label={t('Alert detail')} className={clsx('xl:sticky xl:top-24', late && 'border-danger')}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2"><LevelBadge level={a.level} /><StatusBadge tone={a.status === 'closed' ? 'success' : 'neutral'}>{t(STATUS[a.status])}</StatusBadge></div>
        <IconButton icon={X} label={t('Close detail')} onClick={onClose} />
      </div>
      <h2 className="t-h2">{a.mother?.display_name ?? t('Mother')}</h2>
      <p className={clsx('mt-1 flex items-center gap-1 text-small font-semibold', late ? 'text-danger' : 'text-ink-2')}>
        <Clock className="h-4 w-4" aria-hidden /> {t('Raised {when} · waited {wait}', { when: fmtDateTime(a.created_at), wait: waited(a.created_at) })}{late ? ` · ${t('not acknowledged after 30 minutes')}` : ''}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {a.mother?.phone && <ButtonLink to={`tel:${a.mother.phone}`} variant={red ? 'danger' : 'primary'} icon={Phone}>{t('Call {name}', { name: a.mother.display_name.split(' ')[0] })}</ButtonLink>}
        <ButtonLink to={`/patients/${a.mother_id}`} variant="outline" icon={HeartPulse}>{t('Open her record')}</ButtonLink>
      </div>
      <div className="mt-5 rounded-md bg-surface-2 p-4">
        <p className="t-label">{t('She reported')}</p>
        <ul className="mt-2 list-disc pl-5 text-body text-ink">{a.reasons.length ? a.reasons.map((r) => <li key={r}>{signLabel(r)}</li>) : <li>—</li>}</ul>
      </div>
      <p className={clsx('mt-4 rounded-md border px-4 py-3 text-small', red ? 'border-danger/30 bg-danger-soft text-ink' : 'border-warning/30 bg-warning-soft text-ink')}>
        {red ? tn('{label} the app told her to go to a health facility now. Call her straight away to check she is on her way and has transport.', { label: <b>{t('Red:')}</b> })
             : tn('{label} the app told her to see a health worker within 24 hours. Call her today.', { label: <b>{t('Amber:')}</b> })}
      </p>

      {isFacilityAdmin && a.status !== 'closed' && (
        <div className="mt-5">
          <FormField label={t('Assigned to')} hint={t('Facility admins choose who follows up.')}>
            <Select value={a.assigned_to ?? ''} onChange={async (e) => {
              try { await assignAlert(a.id, e.target.value || null); toast(t('Alert assigned')); onChanged(); } catch (x) { toast((x as Error).message, 'bad'); }
            }}>
              <option value="">{t('Nobody yet')}</option>
              {(team.data ?? []).filter((p) => !p.banned && p.facilities.some((f) => f.id === a.facility_id && f.active)).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </Select>
          </FormField>
        </div>
      )}
      {!isFacilityAdmin && a.assigned && <p className="t-small mt-4">{tn('Assigned to {name}', { name: <b className="text-ink">{a.assigned.display_name}</b> })}</p>}

      {a.status !== 'closed' && (
        <div className="mt-5 grid gap-3">
          <FormField label={t('What you did (optional note)')}><TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('For example: called, she is going to the health centre with her husband')} maxLength={500} /></FormField>
          <div className="flex flex-wrap gap-2">
            {a.status === 'open' && <Button variant="outline" size="sm" icon={UserCheck} loading={busy === 'acknowledged'} onClick={() => act('acknowledged')}>{t('Acknowledge')}</Button>}
            <Button variant="outline" size="sm" icon={PhoneCall} loading={busy === 'contacted'} onClick={() => act('contacted')}>{t('Called her')}</Button>
            <Button variant="outline" size="sm" icon={Send} loading={busy === 'referred'} onClick={() => act('referred')}>{t('Advised to go')}</Button>
            <Button size="sm" icon={CheckCircle2} loading={busy === 'closed'} onClick={() => act('closed')}>{t('Close alert')}</Button>
          </div>
        </div>
      )}

      <h3 className="t-h3 mt-6">{t('History')}</h3>
      {hist.loading ? <LoadingState text={t('Loading history…')} className="py-4" /> : (
        <ol className="mt-3 flex flex-col gap-3 border-l-2 border-line pl-4">
          <li><p className="font-semibold text-ink">{t('Alert raised')}</p><p className="t-caption">{fmtDateTime(a.created_at)} · {t('when her check-in synced')}</p></li>
          {(hist.data ?? []).map((h, i) => (
            <li key={i}><p className="font-semibold text-ink">{h.action === 'note' && /^(Assigned to|Unassigned)/.test(h.note ?? '') ? h.note : ACTION[h.action] ? t(ACTION[h.action]) : h.action}</p>
              <p className="t-caption">{fmtDateTime(h.created_at)} · {h.actor?.display_name ?? ''}</p>
              {h.note && !(h.action === 'note' && /^(Assigned to|Unassigned)/.test(h.note)) && <p className="t-small mt-1 text-ink">{h.note}</p>}</li>
          ))}
        </ol>
      )}
    </BaseCard>
  );
}

export default function AlertsPage() {
  const { facility } = useSession();
  const fid = facility!.id;
  const [params, setParams] = useSearchParams();
  const sel = params.get('id');
  const t = useT();
  const [filter, setFilter] = useState<Filter>('action');
  const { data, loading, error, reload } = useAsync(() => loadAlerts(fid), [fid]);

  // live updates: a new or changed alert reloads the list quietly
  useEffect(() => {
    const ch = supabase.channel(`alerts-${fid}`).on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `facility_id=eq.${fid}` }, () => reload(true)).subscribe();
    const timer = window.setInterval(() => reload(true), 60_000);
    return () => { supabase.removeChannel(ch); window.clearInterval(timer); };
  }, [fid, reload]);

  const list = useMemo(() => (data ?? []).filter((a) => inFilter(a, filter)).sort((a, b) =>
    (filter === 'closed' || filter === 'all' ? 0 : LV[b.level] - LV[a.level]) || (a.created_at < b.created_at ? (filter === 'closed' ? 1 : -1) : 1)), [data, filter]);
  const selected = data?.find((a) => a.id === sel) ?? null;
  const count = (f: Filter) => (data ?? []).filter((a) => inFilter(a, f)).length;

  return (
    <>
      <PageHeader title={t('Alerts')} subtitle={t('Amber and red check-ins from mothers who share with {name}. Red first. Updates live.', { name: facility!.name })} />
      <div className="mb-4">
        <Chips label={t('Show alerts')} value={filter} onChange={setFilter} options={[
          { value: 'action', label: t('Needs action'), count: count('action') }, { value: 'open', label: t('Open'), count: count('open') },
          { value: 'progress', label: t('In progress'), count: count('progress') }, { value: 'closed', label: t('Closed'), count: count('closed') }, { value: 'all', label: t('All'), count: count('all') }]} />
      </div>
      {loading ? <LoadingState text={t('Loading alerts…')} /> : error ? <ErrorState text={error} onRetry={() => reload()} /> : (
        <div className={clsx('grid gap-6', selected && 'xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]')}>
          <BaseCard padded={false} aria-label={t('Alert list')}>
            {list.length === 0 ? <EmptyState icon={Siren} title={filter === 'action' ? t('No alerts need action') : t('Nothing here')} text={t('New amber and red check-ins appear here as mothers sync.')} /> : (
              <ul className="divide-y divide-line">
                {list.map((a) => {
                  const late = a.level === 'red' && a.status === 'open' && Date.now() - new Date(a.created_at).getTime() > 30 * 6e4;
                  return (
                    <li key={a.id}>
                      <button type="button" onClick={() => setParams(sel === a.id ? {} : { id: a.id })} aria-current={sel === a.id ? 'true' : undefined}
                        className={clsx('flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-surface-2 sm:flex-nowrap sm:px-5', sel === a.id && 'bg-primary-soft', late && 'border-l-4 border-danger')}>
                        <LevelBadge level={a.level} short />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-ink">{a.mother?.display_name ?? t('Mother')}</span>
                          <span className="t-small block truncate">{a.reasons.map(signLabel).join(' · ') || '—'}</span>
                        </span>
                        <span className="w-full pl-0 sm:w-auto sm:shrink-0 sm:text-right">
                          <span className={clsx('mr-2 inline text-small font-semibold sm:mr-0 sm:block', late ? 'text-danger' : 'text-ink')}>{a.status === 'closed' ? fmtDateTime(a.closed_at) : waited(a.created_at)}</span>
                          <span className="t-caption inline sm:block">{late ? t('Over 30 min, not acknowledged') : t(STATUS[a.status])}{a.assigned && a.status !== 'open' ? ` · ${a.assigned.display_name.split(' ')[0]}` : ''}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </BaseCard>
          {selected && <Detail a={selected} onClose={() => setParams({})} onChanged={() => reload(true)} />}
          {sel && !selected && <p className="t-small">{t("That alert is not in this facility's list.")} <Link to="/alerts" className="font-semibold text-primary underline">{t('Show all alerts')}</Link></p>}
        </div>
      )}
    </>
  );
}
