import clsx from 'clsx';
import { AlertTriangle, CalendarClock, ChevronRight, Clock, Gauge, HeartPulse, Phone, Siren, Syringe, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/Shell';
import { Kpi, LevelBadge } from '@/components/ui/Bits';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { alerts, dueSoon, riskQueue } from '@/lib/api';
import { babyAge, fmtDate, LV, signLabel, vaccineLabel, visitLabel, waited } from '@/lib/format';
import { msg, useT } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';
import { TodayAppointments } from './TodayAppointments';

const BAND = { high: { tone: 'danger', label: msg('High') }, medium: { tone: 'warning', label: msg('Medium') }, low: { tone: 'neutral', label: msg('Low') } } as const;
const ACTIVE = ['open', 'acknowledged', 'contacted', 'referred'];

export default function TodayPage() {
  const { facility } = useSession();
  const t = useT();
  const fid = facility!.id;
  const { data, loading, error, reload } = useAsync(async () => {
    const [q, al, due] = await Promise.all([riskQueue(fid), alerts(fid), dueSoon(fid)]);
    return { q, al, due };
  }, [fid]);

  if (loading) return <LoadingState text={t("Loading today's work…")} />;
  if (error || !data) return <ErrorState title={t('Today could not load')} text={error ?? ''} onRetry={() => reload()} />;

  const now = Date.now();
  const waiting = data.al.filter((a) => ACTIVE.includes(a.status)).sort((a, b) => LV[b.level] - LV[a.level] || (a.created_at < b.created_at ? -1 : 1));
  const lateRed = waiting.filter((a) => a.level === 'red' && a.status === 'open' && now - new Date(a.created_at).getTime() > 30 * 6e4);
  const quiet = data.q.filter((r) => r.reasons.some((x) => /No check-in for/.test(x)));
  const name = (id: string) => data.due.mothers.find((m) => m.id === id)?.display_name ?? t('Mother');
  const vxByChild = Object.values(data.due.overdueVaccines.reduce<Record<string, { mother: string; due: string; keys: string[] }>>((acc, v) => {
    const k = v.baby_id;
    (acc[k] ??= { mother: v.mother_id, due: v.due_on, keys: [] }).keys.push(v.vaccine_key);
    if (v.due_on < acc[k].due) acc[k].due = v.due_on;
    return acc;
  }, {}));

  return (
    <>
      <PageHeader title={t('Today')} subtitle={t('What needs you first at {name}: open alerts, the 7-day risk ranking, mothers who have gone quiet, and visits and vaccines due.', { name: facility!.name })} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('Red alerts open')} icon={Siren} value={waiting.filter((a) => a.level === 'red').length} tone={waiting.some((a) => a.level === 'red') ? 'danger' : undefined} sub={lateRed.length ? t('{n} waiting over 30 min', { n: lateRed.length }) : t('Act straight away')} />
        <Kpi label={t('Amber alerts open')} icon={AlertTriangle} value={waiting.filter((a) => a.level === 'amber').length} tone={waiting.some((a) => a.level === 'amber') ? 'warning' : undefined} sub={t('Within 24 hours')} />
        <Kpi label={t('High risk this week')} icon={Gauge} value={data.q.filter((r) => r.band === 'high').length} sub={t('Score 50 or more')} />
        <Kpi label={t('No check for 3+ days')} icon={UserX} value={quiet.length} sub={t('Call to check in')} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BaseCard aria-labelledby="t-alerts">
          <CardHeader id="t-alerts" icon={Siren} tone="danger" title={t('Waiting alerts')} subtitle={t('Red first, then amber, oldest first. Open an alert to record what you did.')} />
          {waiting.length === 0 ? <EmptyState compact icon={Siren} title={t('No open alerts')} text={t('New amber and red check-ins appear here as mothers sync.')} /> : (
            <ul className="flex flex-col gap-2">
              {waiting.slice(0, 12).map((a) => {
                const late = a.level === 'red' && a.status === 'open' && now - new Date(a.created_at).getTime() > 30 * 6e4;
                return (
                  <li key={a.id}>
                    <Link to={`/alerts?id=${a.id}`} className={clsx('flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 transition-colors hover:bg-surface-2 sm:flex-nowrap', late ? 'border-danger bg-danger-soft' : 'border-line')}>
                      <LevelBadge level={a.level} short />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-ink">{a.mother?.display_name ?? t('Mother')}</span>
                        <span className="t-small block truncate">{a.reasons.map(signLabel).join(' · ') || '—'}</span>
                      </span>
                      <span className="flex w-full flex-wrap items-center gap-x-2 sm:block sm:w-auto sm:shrink-0 sm:text-right">
                        <span className={clsx('flex items-center gap-1 text-small font-semibold sm:justify-end', late ? 'text-danger' : 'text-ink')}><Clock className="h-4 w-4" aria-hidden />{waited(a.created_at, now)}</span>
                        <span className="t-caption block">{late ? t('Not acknowledged 30+ min') : a.status === 'open' ? t('Open') : t('In progress')}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </BaseCard>

        <BaseCard aria-labelledby="t-risk">
          <CardHeader id="t-risk" icon={Gauge} title={t('Risk ranking · next 7 days')} subtitle={t('A transparent score to decide whom to call first. It never changes the advice a mother was given.')} />
          {data.q.length === 0 ? <EmptyState compact icon={HeartPulse} title={t('No mothers share with this facility yet')} /> : (
            <ol className="flex flex-col divide-y divide-line">
              {data.q.slice(0, 8).map((r) => (
                <li key={r.mother_id}>
                  <Link to={`/patients/${r.mother_id}`} className="flex min-h-14 items-center gap-3 py-2 hover:bg-surface-2">
                    <StatusBadge tone={BAND[r.band].tone}>{r.score} · {t(BAND[r.band].label)}</StatusBadge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{r.display_name}</span>
                      <span className="t-small block truncate">{r.stage === 'pregnant' ? t('Pregnant · {n} wk', { n: String(r.weeks) }) : r.stage === 'baby' && r.baby_days != null ? t('Baby · {age}', { age: babyAge(r.baby_days) }) : t('Stage not recorded')} · {r.reasons[0]?.replace(/ \(\+\d+\)$/, '') ?? t('No risk factors recorded')}</span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-ink-2" aria-hidden />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </BaseCard>

        <BaseCard aria-labelledby="t-quiet">
          <CardHeader id="t-quiet" icon={UserX} title={t('No check for 3 or more days')} subtitle={t('A short call often finds a problem early.')} />
          {quiet.length === 0 ? <EmptyState compact icon={UserX} title={t('Everyone checked in recently')} /> : (
            <ul className="flex flex-col divide-y divide-line">
              {quiet.map((r) => (
                <li key={r.mother_id} className="flex min-h-14 items-center gap-3 py-2">
                  <Link to={`/patients/${r.mother_id}`} className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{r.display_name}</span>
                    <span className="t-small block truncate">{r.reasons.find((x) => /No check-in/.test(x))?.replace(/ \(\+\d+\)$/, '')}</span>
                  </Link>
                  {r.phone && <a href={`tel:${r.phone}`} aria-label={t('Call {name}', { name: r.display_name })} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line text-primary hover:bg-primary-soft"><Phone className="h-5 w-5" aria-hidden /></a>}
                </li>
              ))}
            </ul>
          )}
        </BaseCard>

        <BaseCard aria-labelledby="t-visits">
          <CardHeader id="t-visits" icon={CalendarClock} title={t('Visits due this week')} subtitle={t('Antenatal, postnatal and child visits not yet recorded.')} />
          {data.due.visits.length === 0 ? <EmptyState compact icon={CalendarClock} title={t('No visits due in the next 7 days')} /> : (
            <ul className="flex flex-col divide-y divide-line">
              {data.due.visits.map((v) => (
                <li key={v.id}>
                  <Link to={`/patients/${v.mother_id}`} className="flex min-h-14 items-center gap-3 py-2 hover:bg-surface-2">
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{name(v.mother_id)}</span><span className="t-small block truncate">{visitLabel(v.kind, v.contact_no)}</span></span>
                    <span className="shrink-0 text-small font-semibold text-ink">{fmtDate(v.due_on, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <h3 className="t-h3 mt-6 flex items-center gap-2"><Syringe className="h-5 w-5 text-warning" aria-hidden /> {t('Overdue vaccines')}</h3>
          {vxByChild.length === 0 ? <p className="t-small mt-2">{t('No vaccine doses overdue in the last 60 days.')}</p> : (
            <ul className="mt-2 flex flex-col divide-y divide-line">
              {vxByChild.map((v, i) => (
                <li key={i}>
                  <Link to={`/patients/${v.mother}`} className="flex min-h-14 items-center gap-3 py-2 hover:bg-surface-2">
                    <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{name(v.mother)}</span><span className="t-small block truncate">{v.keys.map(vaccineLabel).join(', ')}</span></span>
                    <StatusBadge tone="warning">{t('Due {date}', { date: fmtDate(v.due, { day: 'numeric', month: 'short' }) })}</StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BaseCard>
      </div>
      <TodayAppointments facility={fid} />
    </>
  );
}
