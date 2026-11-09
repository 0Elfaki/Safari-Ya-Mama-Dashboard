import { ArrowLeft, Baby, CalendarCheck, HeartPulse, Lock, Phone, Siren, Syringe, Users } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Kpi, LevelBadge, useToast } from '@/components/ui/Bits';
import { Button, ButtonLink } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { logView, markAttended, markGiven, patient } from '@/lib/api';
import { babyAge, daysBetween, fmtDate, fmtDateTime, signLabel, startOfToday, toDay, vaccineLabel, visitLabel, weeksSince, worst } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Appointment, Checkin, VaccineDose } from '@/lib/types';
import { msg, tr, useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';

const BpChart = lazy(() => import('./BpChart'));
const REPORTED: Record<string, Record<string, string>> = {
  movement: { fewer: msg('Baby moving less than usual'), none: msg('Baby not moving') },
  baby_feeding: { less: msg('Baby feeding less than usual'), not: msg('Baby not feeding') },
};
/** Only what she reported; the level comes from the fixed warning rules. */
function reported(c: Checkin) {
  const said = [...(c.signs ?? []), ...(c.baby_signs ?? [])].map(signLabel)
    .concat(Object.entries(REPORTED).map(([k, m]) => m[(c as unknown as Record<string, string>)[k]]).filter(Boolean).map((s) => tr(s)));
  if (c.feeling === 'unwell' && !said.length) said.push(tr('Feeling unwell'));
  if (c.systolic) said.push(tr('BP {s}/{d}', { s: c.systolic, d: String(c.diastolic) }));
  return said.length ? said.join(' · ') : tr('No warning signs reported');
}

export default function PatientPage() {
  const { id } = useParams();
  const { facility } = useSession();
  const toast = useToast();
  const t = useT();
  const { data, loading, error, reload } = useAsync(() => patient(id!), [id]);
  const logged = useRef<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // every open of a record is written to audit_log
  useEffect(() => {
    if (data && logged.current !== id) { logged.current = id!; logView(id!, 'record').catch(() => undefined); }
  }, [data, id]);

  if (loading) return <LoadingState text={t('Opening her record…')} />;
  if (error || !data) return <ErrorState title={t('This record could not open')} text={error ?? ''} onRetry={() => reload()} />;

  const { profile, pregnancy: preg, babies, checkins, bp, appointments, vaccines, alerts, caregivers } = data;
  const today = startOfToday();
  const weeks = preg ? weeksSince(preg.lmp) : null;
  const newest = babies[0];
  const born = newest ? babies.filter((b) => b.dob === newest.dob) : [];
  const last = checkins[0];
  const bpPoints = [...bp.map((b) => ({ at: b.client_created_at, s: b.systolic, d: b.diastolic })), ...checkins.filter((c) => c.systolic).map((c) => ({ at: c.client_created_at, s: c.systolic!, d: c.diastolic! }))]
    .sort((a, b) => (a.at < b.at ? -1 : 1));
  const lastBp = bpPoints[bpPoints.length - 1];
  const anc = appointments.filter((a) => a.kind === 'anc');
  const openAlerts = alerts.filter((a) => a.status !== 'closed');

  const toggleVisit = async (a: Appointment, on: boolean) => {
    setBusy(a.id);
    try { await markAttended(a.id, on); toast(on ? t('Visit recorded') : t('Undone')); await reload(true); } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };
  const toggleDose = async (v: VaccineDose, on: boolean) => {
    setBusy(v.id);
    try { await markGiven(v.id, on, facility!.id); toast(on ? t('Vaccine recorded') : t('Undone')); await reload(true); } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };
  const canMark = (due: string) => daysBetween(toDay(due), today) <= 3;

  return (
    <>
      <Link to="/patients" className="mb-4 inline-flex min-h-11 items-center gap-2 text-small font-semibold text-primary"><ArrowLeft className="h-4 w-4" aria-hidden /> {t('Patients')}</Link>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="t-h1">{profile.display_name}</h1>
          <p className="t-small mt-1">
            {preg ? t('Pregnant, {n} weeks · due {date}', { n: String(weeks), date: fmtDate(preg.edd) }) : newest ? `${born.map((b) => b.name || t('Baby')).join(' & ')}${born.length > 1 ? ` ${t('(twins)')}` : ''} · ${t('born {date}', { date: fmtDate(newest.dob) })} · ${babyAge(daysBetween(today, toDay(newest.dob)))}` : t('Stage not recorded')}
            {' · '}{t('speaks {language}', { language: profile.lang === 'sw' ? 'Kiswahili' : profile.lang === 'ar-SD' ? t('Arabic') : t('English') })}
          </p>
          <p className="t-small mt-1 flex items-center gap-1"><Lock className="h-4 w-4" aria-hidden /> {t('Shared with your facility. Opening this record was logged. Her journal is private and never shown.')}</p>
        </div>
        {profile.phone && <ButtonLink to={`tel:${profile.phone}`} icon={Phone}>{t('Call {phone}', { phone: profile.phone })}</ButtonLink>}
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('Latest check-in')} value={last ? { red: t('Red'), amber: t('Amber'), green: t('Green') }[worst(last.level, last.server_level)] : '—'} sub={last ? fmtDateTime(last.client_created_at) : t('None yet')}
          tone={last && worst(last.level, last.server_level) === 'red' ? 'danger' : last && worst(last.level, last.server_level) === 'amber' ? 'warning' : undefined} />
        <Kpi label={t('Latest BP')} value={lastBp ? `${lastBp.s}/${lastBp.d}` : '—'} sub={lastBp ? `${fmtDate(lastBp.at)}${lastBp.s >= 140 || lastBp.d >= 90 ? ` · ${t('at or over 140/90')}` : ''}` : t('No readings shared')} tone={lastBp && (lastBp.s >= 140 || lastBp.d >= 90) ? 'warning' : undefined} />
        <Kpi label={t('ANC contacts')} value={t('{n} of 8', { n: anc.filter((a) => a.attended_on).length })} sub={t('recorded as attended')} />
        <Kpi label={t('Open alerts')} value={openAlerts.length} tone={openAlerts.some((a) => a.level === 'red') ? 'danger' : openAlerts.length ? 'warning' : undefined} sub={openAlerts.length ? t('see below') : t('none')} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <BaseCard aria-labelledby="p-checks">
            <CardHeader id="p-checks" icon={HeartPulse} title={t('Daily checks')} subtitle={t('Newest first · {n} shown', { n: checkins.length })} />
            {checkins.length === 0 ? <EmptyState compact icon={HeartPulse} title={t('No check-ins yet')} /> : (
              <ol className="flex flex-col gap-3">
                {checkins.slice(0, 30).map((c) => (
                  <li key={c.id} className="flex items-start gap-3 rounded-md border border-line p-3">
                    <LevelBadge level={worst(c.level, c.server_level)} short />
                    <div className="min-w-0 flex-1">
                      <p className="text-small font-semibold text-ink">{fmtDateTime(c.client_created_at)}{c.baby_id && babies.length > 1 ? ` · ${babies.find((b) => b.id === c.baby_id)?.name ?? t('Baby')}` : ''}</p>
                      <p className="t-small">{reported(c)}</p>
                      {c.note && <p className="mt-2 rounded-sm bg-surface-2 px-3 py-2 text-small text-ink">“{c.note}” <span className="t-caption">{t('her note for the health worker')}</span></p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </BaseCard>
          <BaseCard aria-labelledby="p-bp">
            <CardHeader id="p-bp" icon={HeartPulse} title={t('Blood pressure')} subtitle={t('From her weekly readings and check-ins. The dashed line is 140/90.')} />
            {bpPoints.length === 0 ? <EmptyState compact icon={HeartPulse} title={t('No blood pressure readings shared')} /> : (
              <Suspense fallback={<LoadingState text={t('Drawing chart…')} />}><BpChart points={bpPoints} /></Suspense>
            )}
          </BaseCard>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <BaseCard aria-labelledby="p-alerts">
            <CardHeader id="p-alerts" icon={Siren} tone="danger" title={t('Alerts')} subtitle={t('Open alerts first, with their history in Alerts.')} />
            {alerts.length === 0 ? <p className="t-small">{t('No alerts.')}</p> : (
              <ul className="flex flex-col divide-y divide-line">
                {[...alerts].sort((a, b) => Number(a.status === 'closed') - Number(b.status === 'closed')).slice(0, 10).map((a) => (
                  <li key={a.id}><Link to={`/alerts?id=${a.id}`} className="flex min-h-14 items-center gap-3 py-2 hover:bg-surface-2">
                    <LevelBadge level={a.level} short />
                    <span className="min-w-0 flex-1"><span className="block truncate text-small font-semibold text-ink">{a.reasons.map(signLabel).join(' · ')}</span><span className="t-caption block">{fmtDateTime(a.created_at)}</span></span>
                    <StatusBadge tone={a.status === 'closed' ? 'success' : 'neutral'}>{a.status === 'closed' ? t('Closed') : t('Open')}</StatusBadge>
                  </Link></li>
                ))}
              </ul>
            )}
          </BaseCard>

          <BaseCard aria-labelledby="p-visits">
            <CardHeader id="p-visits" icon={CalendarCheck} title={t('Visits')} subtitle={t('Mark a visit attended on the day, or after it.')} />
            {appointments.length === 0 ? <p className="t-small">{t('No visits scheduled.')}</p> : (
              <ul className="flex flex-col divide-y divide-line">
                {appointments.map((a) => {
                  const past = toDay(a.due_on) < today;
                  return (
                    <li key={a.id} className="flex min-h-14 flex-wrap items-center gap-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block text-small font-semibold text-ink">{visitLabel(a.kind, a.contact_no)}{a.baby_id ? ` · ${t('child')}` : ''}</span>
                        <span className="t-caption block">{fmtDate(a.due_on)}{a.attended_on ? ` · ${t('attended {date}', { date: fmtDate(a.attended_on) })}` : past ? ` · ${t('not recorded')}` : ''}</span>
                      </span>
                      {a.attended_on ? <Button size="sm" variant="ghost" loading={busy === a.id} onClick={() => toggleVisit(a, false)}>{t('Undo')}</Button>
                        : canMark(a.due_on) && <Button size="sm" variant={past ? 'primary' : 'outline'} loading={busy === a.id} onClick={() => toggleVisit(a, true)}>{t('Mark attended')}</Button>}
                    </li>
                  );
                })}
              </ul>
            )}
          </BaseCard>

          {babies.map((kid) => {
            const doses = vaccines.filter((v) => v.baby_id === kid.id);
            return (
              <BaseCard key={kid.id} aria-label={t('Vaccines for {name}', { name: kid.name ?? t('baby') })}>
                <CardHeader icon={Syringe} title={t('Vaccines · {name}', { name: kid.name || t('Baby') })} subtitle={t('Born {date}', { date: fmtDate(kid.dob) })} />
                {doses.length === 0 ? <p className="t-small">{t('No doses scheduled.')}</p> : (
                  <ul className="flex flex-col divide-y divide-line">
                    {doses.map((v) => {
                      const late = !v.given_on && toDay(v.due_on) < today;
                      return (
                        <li key={v.id} className="flex min-h-14 flex-wrap items-center gap-3 py-2">
                          <span className="min-w-0 flex-1">
                            <span className="block text-small font-semibold text-ink">{vaccineLabel(v.vaccine_key)}</span>
                            <span className="t-caption block">{t('due {date}', { date: fmtDate(v.due_on) })}{v.given_on ? ` · ${t('given {date}', { date: fmtDate(v.given_on) })}` : ''}</span>
                          </span>
                          {late && <StatusBadge tone="warning">{t('Overdue')}</StatusBadge>}
                          {v.given_on ? <Button size="sm" variant="ghost" loading={busy === v.id} onClick={() => toggleDose(v, false)}>{t('Undo')}</Button>
                            : canMark(v.due_on) && <Button size="sm" variant={late ? 'primary' : 'outline'} loading={busy === v.id} onClick={() => toggleDose(v, true)}>{t('Mark given')}</Button>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </BaseCard>
            );
          })}
          {babies.length === 0 && preg && (
            <BaseCard><CardHeader icon={Baby} title={t('Baby')} subtitle={t('Vaccines appear here once the baby is added in her app.')} /></BaseCard>
          )}

          <BaseCard aria-labelledby="p-care">
            <CardHeader id="p-care" icon={Users} title={t('Caregivers')} subtitle={t('People she linked in the app. Names only.')} />
            {caregivers.length === 0 ? <p className="t-small">{t('No caregivers linked.')}</p> : (
              <ul className="flex flex-col gap-2">{caregivers.map((c, i) => <li key={i} className="text-small text-ink"><b>{c.name || t('Caregiver')}</b> · {c.relation} · {t('since {date}', { date: fmtDate(c.since) })}</li>)}</ul>
            )}
          </BaseCard>
        </div>
      </div>
    </>
  );
}
