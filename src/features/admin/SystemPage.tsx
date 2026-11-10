import clsx from 'clsx';
import { AlertTriangle, BellRing, Bot, CheckCircle2, Clock, Cloud, Database, RefreshCw, ServerCog, Smartphone, XCircle } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { SecuritySwitch } from './SecuritySwitch';
import { Kpi, Table, Td, Th } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { functionStatus, systemHealth } from '@/lib/api';
import { ago, fmtDateTime, fmtNum, waited } from '@/lib/format';
import { currentLang, msg, useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';

const CountLine = lazy(() => import('./charts').then((m) => ({ default: m.CountLine })));
const FUNCTIONS = [
  { slug: 'ai-gateway', what: msg('MamaBot AI answers (Groq). Without the GROQ_API_KEY secret the app uses its scripted answers.') },
  { slug: 'admin-users', what: msg('Creates, invites, resets and deactivates staff and admin accounts.') },
  { slug: 'send-notifications', what: msg('Sends push notifications from the notification queue every 5 minutes.') },
];
const CRON: Record<string, string> = { 'visit-reminders': msg('Queues visit reminders each morning'), 'red-escalation': msg('Tells facility admins about red alerts not acknowledged after 30 minutes'), 'purge-deleted': msg('Removes data 30 days after a mother deletes it'), 'send-notifications': msg('Sends queued push notifications') }
/** How long the oldest push has waited (English keeps the original "3 h" wording). */
const waitedSince = (iso: string) => (currentLang() === 'sw' ? waited(iso) : ago(iso).replace(' ago', ''));;

export default function SystemPage() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [h, ...fns] = await Promise.all([systemHealth(), ...FUNCTIONS.map((f) => functionStatus(f.slug))]);
    return { h, fns };
  }, []);
  const t = useT();

  return (
    <>
      <PageHeader title={t('System health')} subtitle={t('Edge Functions, scheduled jobs, the push notification queue, AI usage and data freshness.')}
        actions={<Button variant="outline" icon={RefreshCw} onClick={() => reload()} loading={loading}>{t('Refresh')}</Button>} />
      <SecuritySwitch />
      {loading && !data ? <LoadingState text={t('Checking the system…')} /> : error || !data ? <ErrorState text={error ?? ''} onRetry={() => reload()} /> : (() => {
        const { h, fns } = data;
        const queueBad = h.queue.failed_24h > 0 || (h.queue.oldest_due && Date.now() - new Date(h.queue.oldest_due).getTime() > 30 * 6e4);
        return (
          <div className="flex flex-col gap-6">
            <p className="t-small">{t('Checked {when}', { when: fmtDateTime(h.checked_at) })}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label={t('Pushes waiting')} icon={BellRing} value={fmtNum(h.queue.due)} tone={queueBad ? 'warning' : undefined} sub={h.queue.oldest_due ? t('oldest waiting {time}', { time: waitedSince(h.queue.oldest_due) }) : t('nothing waiting')} />
              <Kpi label={t('Failed pushes (24 h)')} icon={XCircle} value={fmtNum(h.queue.failed_24h)} tone={h.queue.failed_24h ? 'danger' : undefined} sub={t('{n} in 7 days', { n: fmtNum(h.queue.failed_7d) })} />
              <Kpi label={t('AI questions (24 h)')} icon={Bot} value={fmtNum(h.ai.last_24h)} sub={t('{n} in 7 days', { n: fmtNum(h.ai.last_7d) })} />
              <Kpi label={t('Database size')} icon={Database} value={`${h.db_size_mb} MB`} sub={t('Free plan limit is 500 MB')} tone={h.db_size_mb > 400 ? 'warning' : undefined} />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <BaseCard>
                <CardHeader icon={Cloud} title={t('Edge Functions')} subtitle={t('A function that answers is deployed and running.')} />
                <ul className="flex flex-col divide-y divide-line">
                  {FUNCTIONS.map((f, i) => (
                    <li key={f.slug} className="flex items-start gap-3 py-3">
                      <span className="min-w-0 flex-1"><span className="block font-semibold text-ink">{f.slug}</span><span className="t-small block">{t(f.what)}</span></span>
                      {fns[i] === 'running' ? <StatusBadge tone="success" icon={CheckCircle2}>{t('Running')}</StatusBadge> : fns[i] === 'not_deployed' ? <StatusBadge tone="warning" icon={AlertTriangle}>{t('Not deployed')}</StatusBadge> : <StatusBadge tone="danger" icon={XCircle}>{t('Unreachable')}</StatusBadge>}
                    </li>
                  ))}
                </ul>
              </BaseCard>

              <BaseCard>
                <CardHeader icon={Clock} title={t('Scheduled jobs')} subtitle={t('pg_cron jobs and their latest run.')} />
                {h.cron.length === 0 ? <p className="t-small">{t('No scheduled jobs.')}</p> : (
                  <ul className="flex flex-col divide-y divide-line">
                    {h.cron.map((j) => {
                      const ok = j.last?.status === 'succeeded';
                      return (
                        <li key={j.job} className="flex items-start gap-3 py-3">
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-ink">{j.job} <span className="t-caption font-normal">{j.schedule}</span></span>
                            <span className="t-small block">{CRON[j.job] ? t(CRON[j.job]) : ''}</span>
                            <span className="t-caption block">{j.last ? `${t('Last run {when}', { when: fmtDateTime(j.last.start) })}${j.failures_24h ? ` · ${t('{n} failures in 24 h', { n: j.failures_24h })}` : ''}` : t('Has not run yet')}</span>
                            {j.last && !ok && j.last.message && <span className="t-caption block text-danger">{j.last.message}</span>}
                          </span>
                          {!j.active ? <StatusBadge>{t('Paused')}</StatusBadge> : !j.last ? <StatusBadge tone="neutral">{t('Waiting')}</StatusBadge> : ok ? <StatusBadge tone="success" icon={CheckCircle2}>{t('Succeeded')}</StatusBadge> : <StatusBadge tone="danger" icon={XCircle}>{j.last.status}</StatusBadge>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </BaseCard>

              <BaseCard>
                <CardHeader icon={BellRing} title={t('Notification queue')} subtitle={t('Push, SMS and WhatsApp messages waiting to be sent.')} />
                <dl className="grid grid-cols-2 gap-4 text-small">
                  {([[msg('Queued (all)'), h.queue.queued], [msg('Due now'), h.queue.due], [msg('Sent in 24 h'), h.queue.sent_24h], [msg('Failed in 24 h'), h.queue.failed_24h]] as const).map(([k, v]) => (
                    <div key={k}><dt className="t-caption">{t(k)}</dt><dd className="t-num font-display text-h3 font-bold text-ink">{fmtNum(v)}</dd></div>
                  ))}
                </dl>
                {Object.keys(h.queue.by_channel).length > 0 && <p className="t-small mt-3">{t('Waiting by channel: {list}', { list: Object.entries(h.queue.by_channel).map(([c, n]) => `${c} ${n}`).join(' · ') })}</p>}
                <h3 className="t-h3 mt-5">{t('Recent failures')}</h3>
                {h.failed_recent.length === 0 ? <p className="t-small mt-2">{t('None.')}</p> : (
                  <Table caption={t('Recent failed notifications')}><thead><tr><Th>{t('Message')}</Th><Th>{t('Channel')}</Th><Th>{t('When')}</Th></tr></thead>
                    <tbody>{h.failed_recent.map((f, i) => <tr key={i}><Td>{f.template.replace(/_/g, ' ')}</Td><Td>{f.channel}</Td><Td className="whitespace-nowrap">{fmtDateTime(f.at)}</Td></tr>)}</tbody></Table>
                )}
                <p className="t-small mt-4 flex items-center gap-2"><Smartphone className="h-4 w-4" aria-hidden /> {t('{n} phones registered for push.', { n: fmtNum(h.push_devices) })}</p>
              </BaseCard>

              <BaseCard>
                <CardHeader icon={Bot} title={t('MamaBot AI usage')} subtitle={t('Questions per day over 14 days. Only who and when is kept, never the question.')} />
                <Suspense fallback={<LoadingState text={t('Drawing chart…')} />}><CountLine rows={h.ai.per_day} name={t('Questions')} label={t('MamaBot AI questions per day, last 14 days')} /></Suspense>
              </BaseCard>

              <BaseCard className="xl:col-span-2">
                <CardHeader icon={ServerCog} title={t('Data freshness')} subtitle={t('When data last arrived. A long gap can mean the app cannot sync.')} />
                <dl className="grid gap-4 sm:grid-cols-3">
                  {([[msg('Last check-in received'), h.data.last_checkin], [msg('Last mother joined'), h.data.last_mother_signup], [msg('Last staff sign-in'), h.data.last_staff_sign_in]] as const).map(([k, v]) => (
                    <div key={k} className={clsx('rounded-md border p-4', v && Date.now() - new Date(v).getTime() > 3 * 864e5 ? 'border-warning/30 bg-warning-soft' : 'border-line')}>
                      <dt className="t-caption">{t(k)}</dt><dd className="mt-1 font-semibold text-ink">{v ? ago(v) : t('Never')}</dd><dd className="t-caption">{fmtDateTime(v)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="t-small mt-4">{t('Accounts: {mothers} mothers · {caregivers} caregivers · {staff} staff · {admins} admins · {deletions} waiting to be deleted.', { mothers: fmtNum(h.data.mothers), caregivers: fmtNum(h.data.caregivers), staff: fmtNum(h.data.staff), admins: fmtNum(h.data.admins), deletions: fmtNum(h.data.pending_deletions) })}</p>
              </BaseCard>
            </div>
          </div>
        );
      })()}
    </>
  );
}
