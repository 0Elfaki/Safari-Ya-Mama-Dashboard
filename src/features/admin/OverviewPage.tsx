import {
  Activity, Baby, BadgeCheck, Bell, BookOpen, Bot, Building2, CalendarClock, CalendarX, CheckCircle2, Clock, Download, FileLock2, Globe, HeartHandshake,
  HeartPulse, Images, Inbox, Info, KeyRound, LineChart, Ruler, Siren, Smartphone, Stethoscope, Syringe, UserPlus, Users,
} from 'lucide-react';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/Shell';
import { BookingKpis, CommunityKpis } from '@/components/CareKpis';
import { Kpi } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import pictures from '@/data/app-pictures.json';
import { daily, facilityTable, kpis, kpisExtra, platformKpis } from '@/lib/api';
import { downloadCsv, toCsv } from '@/lib/csv';
import { ago, fmtNum, fmtPct } from '@/lib/format';
import { tr, useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';
import { defaultScope, ScopeFilter, type Scope } from './ScopeFilter';

const Charts = { Checks: lazy(() => import('./charts').then((m) => ({ default: m.ChecksChart }))), Line: lazy(() => import('./charts').then((m) => ({ default: m.CountLine }))),
  Vaccines: lazy(() => import('./charts').then((m) => ({ default: m.VaccineChart }))), Anc: lazy(() => import('./charts').then((m) => ({ default: m.AncChart }))) };
const ALL_PICTURES = pictures.groups.reduce((n, g) => n + g.ids.length, 0) + pictures.lessons.reduce((n, l) => n + l.ids.length, 0);
const share = (n?: number, of?: number) => (of ? tr('{pct}% of checks', { pct: Math.round(((n ?? 0) / of) * 100) }) : tr('no checks yet'));
const pct = (n: number | null | undefined) => (n == null ? tr('None yet') : fmtPct(n));

function Section({ title, sub, children, cols = 4 }: { title: string; sub?: ReactNode; children: ReactNode; cols?: 3 | 4 }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="t-h3">{title}</h2>
        {sub && <p className="t-small">{sub}</p>}
      </div>
      <div className={cols === 3 ? 'grid grid-cols-2 gap-3 md:grid-cols-3' : 'grid grid-cols-2 gap-3 md:grid-cols-4'}>{children}</div>
    </section>
  );
}

export default function OverviewPage() {
  const [scope, setScope] = useState<Scope>(defaultScope);
  const args = { from: scope.from, to: scope.to, country: scope.country, district: scope.district, facility: scope.facility };
  const sys = useAsync(platformKpis, []);
  const { data, loading, error, reload } = useAsync(async () => {
    const [k, x, d] = await Promise.all([kpis(args), kpisExtra(args), daily(args)]);
    return { k, x, d };
  }, [scope.from, scope.to, scope.country, scope.district, scope.facility]);

  const t = useT();
  const exportCsv = async () => {
    const table = await facilityTable(args);
    const { k, x } = data!;
    const flat: Record<string, unknown> = { from: scope.from, to: scope.to, country: scope.country || 'all', district: scope.district || 'all', facility: scope.facility || 'all',
      fewer_than_5: k.suppressed, facilities: k.facilities, staff: k.staff, mothers: k.mothers, active_7d: k.active_7d, pregnant: k.pregnant, postnatal: k.postnatal,
      new_mothers: k.new_mothers, checks: k.checks?.total, checks_red: k.checks?.red, checks_amber: k.checks?.amber, alerts_red: k.alerts?.red, alerts_amber: k.alerts?.amber,
      alerts_open: k.alerts?.open, alerts_closed: k.alerts?.closed, median_ack_red_min: k.alerts?.median_ack_red_min, red_ack_30m_pct: k.alerts?.red_ack_30m_pct,
      anc_mean_of_8: k.anc?.mean_completed, anc4_pct: k.anc?.anc4_pct, anc8_pct: k.anc?.anc8_pct, anc1_before_12w_pct: x.anc1_before_12w_pct,
      high_bp_women: x.high_bp_women, reduced_movements: x.reduced_movements, birth_plan_36w_pct: x.pregnancy?.birth_plan_36w_pct, due_14d: x.pregnancy?.due_14d,
      babies: x.baby?.babies, vaccines_on_time_pct: x.vaccines_on_time_pct, growth_monthly_pct: x.baby?.growth_monthly_pct, overdue_visits: k.overdue_visits,
      overdue_vaccines: k.overdue_vaccines, caregivers: k.caregivers, notes_shared: k.notes?.shared, notes_opened: k.notes?.opened, ai_questions: k.ai_questions,
      lesson_views: k.lesson_views, lessons_completed: x.engagement?.lessons_completed, active_30d: x.engagement?.active_30d };
    const csv = ['# Totals (groups of 1 to 4 mothers are blank)', toCsv([flat]), '', '# Per day', toCsv(data!.d as unknown as Record<string, unknown>[]), '', '# Per facility (counts of 1 to 4 mothers are blank)',
      toCsv(table.map(({ lat, lng, facility_id, ...r }) => { void lat; void lng; void facility_id; return r; }))].join('\n');
    downloadCsv(`safari-ya-mama-kpis-${scope.from}-to-${scope.to}.csv`, csv);
  };

  const p = sys.data;
  const k = data?.k, x = data?.x;
  const hide = !!k?.suppressed;
  const noMothers = !hide && (k?.mothers ?? 0) === 0;
  const staffN = (p?.accounts.health_worker ?? 0) + (p?.accounts.facility_admin ?? 0);
  const adminN = (p?.accounts.super_admin ?? 0) + (p?.accounts.programme_admin ?? 0);
  const webN = (p?.accounts.editor ?? 0) + (p?.accounts.author ?? 0) + (p?.accounts.clinical_reviewer ?? 0) + (p?.accounts.viewer ?? 0);

  return (
    <>
      <PageHeader title={t('Programme KPIs')} subtitle={<>{t('The whole system at a glance: the platform itself, then the mothers and their care. Every figure is an aggregate.')} <Link className="inline-block min-h-6 font-semibold text-primary underline" to="/about-numbers">{t('How each number is worked out')}</Link></>}
        actions={<Button variant="outline" icon={Download} disabled={!data} onClick={exportCsv}>{t('Export CSV')}</Button>} />

      {/* ───────── the system today (not filtered) */}
      {sys.loading ? <LoadingState text={t('Loading the system figures…')} /> : sys.error || !p ? <ErrorState className="mb-8" text={sys.error ?? ''} onRetry={() => sys.reload()} /> : (
        <>
          <Section title={t('People and places')} sub={t('Checked {when}', { when: ago(p.checked_at) })}>
            <Kpi label={t('Facilities active')} icon={Building2} value={fmtNum(p.facilities.active)} sub={t('{n} without staff · {e} open 24 h', { n: p.facilities.without_staff, e: p.facilities.emergency_24h })} tone={p.facilities.without_staff ? 'warning' : undefined} />
            <Kpi label={t('Medical staff accounts')} icon={Users} value={fmtNum(staffN)} sub={t('{hw} health workers · {fa} facility admins', { hw: p.accounts.health_worker ?? 0, fa: p.accounts.facility_admin ?? 0 })} />
            <Kpi label={t('Admin and website accounts')} icon={KeyRound} value={fmtNum(adminN + webN)} sub={t('{admins} admins · {web} website team · {n} without 2-step yet', { admins: adminN, web: webN, n: p.accounts_without_mfa })} tone={p.accounts_without_mfa ? 'warning' : undefined} />
            <Kpi label={t('Invites not accepted')} icon={UserPlus} value={fmtNum(p.accounts_unconfirmed)} sub={t('accounts that never confirmed their email')} />
            <Kpi label={t('Mothers registered')} icon={HeartPulse} value={fmtNum(p.usage.mothers)} hidden={p.usage.mothers == null} sub={p.usage.mothers === 0 ? t('none yet: the app is ready for them') : t('{n} new in 30 days', { n: fmtNum(p.usage.mothers_new_30d) })} />
            <Kpi label={t('Caregivers linked')} icon={HeartHandshake} value={fmtNum(p.usage.caregivers)} hidden={p.usage.caregivers == null} />
            <Kpi label={t('Phones with notifications')} icon={Bell} value={fmtNum(p.usage.push_devices)} sub={t('{n} failed sends in 7 days', { n: p.usage.notifications_failed_7d })} tone={p.usage.notifications_failed_7d ? 'warning' : undefined} />
            <Kpi label={t('Staff sign-ins (7 days)')} icon={Activity} value={fmtNum(p.usage.staff_sign_ins_7d)} sub={t('{n} mother records opened', { n: p.usage.records_opened_7d })} />
          </Section>
          <Section title={t('Content the app and website show')}>
            <Kpi label={t('App content version')} icon={Smartphone} value={fmtNum(p.content.content_version)} sub={`${t('{n} announcements and texts live', { n: p.content.app_items_live })}${p.content.app_items_pending_review ? ` · ${t('{n} awaiting clinical review', { n: p.content.app_items_pending_review })}` : ''}`} />
            <Kpi label={t('Lessons published')} icon={BookOpen} value={fmtNum(p.content.lessons_published)} sub={t('{app} in the app · {web} on the website · {draft} drafts', { app: p.content.lessons_app, web: p.content.lessons_web, draft: p.content.lessons_draft })} />
            <Kpi label={t('Lessons without clinical sign-off')} icon={Stethoscope} value={fmtNum(p.content.lessons_unreviewed)} tone={p.content.lessons_unreviewed ? 'warning' : 'success'} sub={t('in at least one language')} />
            <Kpi label={t('App pictures uploaded')} icon={Images} value={`${fmtNum(p.content.app_pictures)} / ${ALL_PICTURES}`} sub={t('{n} more are built into the app', { n: pictures.bundled.length })} />
            <Kpi label={t('Blog posts live')} icon={Globe} value={fmtNum(p.website.posts_live)} sub={t('{scheduled} scheduled · {review} in review · {draft} drafts', { scheduled: p.website.posts_scheduled, review: p.website.posts_in_review, draft: p.website.posts_draft })} />
            <Kpi label={t('Website sections live')} icon={Globe} value={`${fmtNum(p.website.sections_live)} / ${fmtNum(p.website.sections_total)}`} sub={p.website.sections_changed ? t('{n} with unpublished changes', { n: p.website.sections_changed }) : t('no unpublished changes')} tone={p.website.sections_changed ? 'warning' : undefined} />
            <Kpi label={t('Partners shown')} icon={BadgeCheck} value={fmtNum(p.website.partners_live)} sub={t('{n} proposed, waiting for confirmation', { n: p.website.partners_proposed })} />
            <Kpi label={t('New contact messages')} icon={Inbox} value={fmtNum(p.website.messages_new)} tone={p.website.messages_new ? 'warning' : undefined} sub={t('{n} in 30 days', { n: p.website.messages_30d })} />
          </Section>
        </>
      )}

      {/* ───────── mothers and care (filtered) */}
      <h2 className="t-h2 mb-3">{t('Mothers and their care')}</h2>
      <BaseCard className="mb-6"><ScopeFilter value={scope} onChange={setScope} /></BaseCard>
      {loading ? <LoadingState text={t('Loading figures…')} /> : error || !k || !x ? <ErrorState text={error ?? ''} onRetry={() => reload()} /> : (
        <>
          {(hide || noMothers) && (
            <div role="status" className="mb-6 flex items-start gap-3 rounded-lg border border-line bg-surface p-5 shadow-card">
              <Info className="h-6 w-6 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-semibold text-ink">{hide ? t('Fewer than 5 mothers in this selection') : t('No mothers in this selection yet')}</p>
                <p className="t-small mt-1">{hide
                  ? t('Figures about mothers are hidden when 1 to 4 mothers are in a group, so that nobody can be recognised from them. Choose all facilities or a longer period to see them.')
                  : t('Every figure below is real and live: they fill in as soon as mothers register in the app and share with a facility. Groups of 1 to 4 mothers will show as “Fewer than 5” to protect their privacy.')}</p>
              </div>
            </div>
          )}
          <Section title={t('Enrolment')}>
            <Kpi label={t('Mothers')} icon={HeartPulse} value={fmtNum(k.mothers ?? 0)} hidden={hide} sub={t('{n} joined in this period', { n: fmtNum(k.new_mothers ?? 0) })} />
            <Kpi label={t('Active in 7 days')} icon={Activity} value={fmtNum(k.active_7d ?? 0)} hidden={hide} sub={k.mothers ? t('{pct}% checked in', { pct: Math.round(((k.active_7d ?? 0) / k.mothers) * 100) }) : t('checked in at least once')} />
            <Kpi label={t('Pregnant')} icon={HeartPulse} value={fmtNum(k.pregnant ?? 0)} hidden={hide} sub={x.pregnancy ? t('{a} · {b} · {c} by trimester', { a: x.pregnancy.trimester_1, b: x.pregnancy.trimester_2, c: x.pregnancy.trimester_3 }) : undefined} />
            <Kpi label={t('With a baby')} icon={Baby} value={fmtNum(k.postnatal ?? 0)} hidden={hide} sub={x.baby ? t('{n} babies under 1 month', { n: x.baby.under_1_month }) : undefined} />
          </Section>
          <Section title={t('Daily checks and alerts')}>
            <Kpi label={t('Daily checks')} icon={CheckCircle2} value={fmtNum(k.checks?.total ?? 0)} hidden={hide} sub={x.engagement?.checks_per_mother ? t('{n} per checking mother', { n: x.engagement.checks_per_mother }) : t('in this period')} />
            <Kpi label={t('Red results')} icon={Siren} value={fmtNum(k.checks?.red ?? 0)} hidden={hide} tone={k.checks?.red ? 'danger' : undefined} sub={share(k.checks?.red, k.checks?.total)} />
            <Kpi label={t('Median time to acknowledge red')} icon={Clock} value={k.alerts?.median_ack_red_min == null ? t('None yet') : t('{n} min', { n: Math.round(k.alerts.median_ack_red_min) })} hidden={hide} sub={t('{pct} within 30 min', { pct: pct(k.alerts?.red_ack_30m_pct) })} />
            <Kpi label={t('Alerts open / closed')} icon={Siren} value={`${fmtNum(k.alerts?.open ?? 0)} / ${fmtNum(k.alerts?.closed ?? 0)}`} hidden={hide} sub={t('{red} red · {amber} amber raised', { red: fmtNum(k.alerts?.red ?? 0), amber: fmtNum(k.alerts?.amber ?? 0) })} />
          </Section>
          <Section title={t('Pregnancy care')}>
            <Kpi label={t('First ANC visit before 12 weeks')} icon={Stethoscope} value={pct(x.anc1_before_12w_pct)} hidden={hide} />
            <Kpi label={t('ANC contacts (of 8)')} icon={Stethoscope} value={k.anc?.mean_completed ?? t('None yet')} hidden={hide} sub={t('average · {p4} with 4+ · {p8} with 8', { p4: pct(k.anc?.anc4_pct), p8: pct(k.anc?.anc8_pct) })} />
            <Kpi label={t('Women with high blood pressure')} icon={LineChart} value={fmtNum(x.high_bp_women ?? 0)} hidden={hide} tone={x.high_bp_women ? 'warning' : undefined} sub={t('a reading at or above 140/90 in this period')} />
            <Kpi label={t('Reduced baby movements')} icon={HeartPulse} value={fmtNum(x.reduced_movements ?? 0)} hidden={hide} tone={x.reduced_movements ? 'warning' : undefined} sub={t('women reporting fewer or no movements')} />
            <Kpi label={t('36+ weeks with a birth plan')} icon={CalendarClock} value={pct(x.pregnancy?.birth_plan_36w_pct)} hidden={hide} sub={t('{n} women at 36+ weeks', { n: x.pregnancy?.weeks_36_plus ?? 0 })} />
            <Kpi label={t('Due in the next 14 days')} icon={CalendarClock} value={fmtNum(x.pregnancy?.due_14d ?? 0)} hidden={hide} />
            <Kpi label={t('Overdue visits')} icon={CalendarX} value={fmtNum(k.overdue_visits ?? 0)} hidden={hide} tone={k.overdue_visits ? 'warning' : undefined} />
            <Kpi label={t('Kick-count sessions')} icon={Activity} value={fmtNum(x.kick_sessions ?? 0)} hidden={hide} />
          </Section>
          <Section title={t('Baby care')}>
            <Kpi label={t('Babies')} icon={Baby} value={fmtNum(x.baby?.babies ?? 0)} hidden={hide} />
            <Kpi label={t('Vaccines given on time')} icon={Syringe} value={pct(x.vaccines_on_time_pct)} hidden={hide} sub={t('within 14 days of the due date')} />
            <Kpi label={t('Overdue vaccines')} icon={Syringe} value={fmtNum(k.overdue_vaccines ?? 0)} hidden={hide} tone={k.overdue_vaccines ? 'warning' : undefined} />
            <Kpi label={t('Growth measured this month')} icon={Ruler} value={pct(x.baby?.growth_monthly_pct)} hidden={hide} sub={t('babies under 2 years')} />
            <Kpi label={t('Baby checks with danger signs')} icon={Siren} value={fmtNum(x.baby_checks?.with_danger_signs ?? 0)} hidden={hide} tone={x.baby_checks?.with_danger_signs ? 'danger' : undefined} sub={t('of {n} baby checks', { n: fmtNum(x.baby_checks?.total ?? 0) })} />
          </Section>
          <Section title={t('Engagement')}>
            <Kpi label={t('Active in 30 days')} icon={Activity} value={fmtNum(x.engagement?.active_30d ?? 0)} hidden={hide} />
            <Kpi label={t('Lessons opened / finished')} icon={BookOpen} value={`${fmtNum(k.lesson_views ?? 0)} / ${fmtNum(x.engagement?.lessons_completed ?? 0)}`} hidden={hide} />
            <Kpi label={t('MamaBot questions')} icon={Bot} value={fmtNum(k.ai_questions ?? 0)} hidden={hide} sub={t('answered by the AI gateway')} />
            <Kpi label={t("Doctor's Notes shared")} icon={FileLock2} value={fmtNum(k.notes?.shared ?? 0)} hidden={hide} sub={t('{n} opened by a clinician', { n: fmtNum(k.notes?.opened ?? 0) })} />
            <Kpi label={t('Caregivers linked')} icon={HeartHandshake} value={fmtNum(k.caregivers ?? 0)} hidden={hide} />
            <Kpi label={t('Birth plans made')} icon={CalendarClock} value={fmtNum(x.engagement?.birth_plans ?? 0)} hidden={hide} />
            <Kpi label={t('Questions for the next visit')} icon={Stethoscope} value={fmtNum(x.engagement?.visit_questions ?? 0)} hidden={hide} />
            <Kpi label={t('Medicine plans')} icon={Clock} value={fmtNum(x.engagement?.medication_plans ?? 0)} hidden={hide} />
          </Section>
          <section className="mb-8"><h2 className="t-h3 mb-3">{t('Appointments and video calls')}</h2><BookingKpis facility={scope.facility || null} from={scope.from} to={scope.to} /></section>
          <section className="mb-8"><h2 className="t-h3 mb-3">{t("Mothers' circle (all facilities)")}</h2><CommunityKpis from={scope.from} to={scope.to} /></section>
          {!hide && (
            <div className="grid gap-6 xl:grid-cols-2">
              <BaseCard><CardHeader icon={HeartPulse} title={t('Checks per day')} subtitle={t('Share of red and amber, by day.')} />
                <Suspense fallback={<LoadingState text={t('Drawing chart…')} />}><Charts.Checks rows={data!.d} /></Suspense></BaseCard>
              <BaseCard><CardHeader icon={Bot} title={t('MamaBot AI questions per day')} subtitle={t('From ai_usage: who and when only, never the question.')} />
                <Suspense fallback={<LoadingState text={t('Drawing chart…')} />}><Charts.Line rows={data!.d.map((r) => ({ day: r.day, n: r.ai_questions }))} name={t('Questions')} label={t('MamaBot AI questions per day')} /></Suspense></BaseCard>
              <BaseCard><CardHeader icon={Syringe} title={t('Vaccine coverage by dose')} subtitle={t('Doses due in this period: given within 14 days of due, or later.')} />
                {k.vaccines?.length ? <Suspense fallback={<LoadingState text={t('Drawing chart…')} />}><Charts.Vaccines rows={k.vaccines} /></Suspense> : <p className="t-small">{t('No doses were due in this period.')}</p>}</BaseCard>
              <BaseCard><CardHeader icon={Stethoscope} title={t('ANC contacts completed')} subtitle={t('{n} pregnancies in this period, by contacts attended.', { n: fmtNum(k.anc?.mothers ?? 0) })} />
                {k.anc?.distribution ? <Suspense fallback={<LoadingState text={t('Drawing chart…')} />}><Charts.Anc dist={k.anc.distribution} /></Suspense> : <p className="t-small">{t('No pregnancies recorded yet.')}</p>}</BaseCard>
              {!!x.engagement?.top_lessons.length && (
                <BaseCard><CardHeader icon={BookOpen} title={t('Most opened lessons')} />
                  <ol className="t-small list-decimal pl-5">{x.engagement.top_lessons.map((l) => <li key={l.lesson}>{t('{lesson}: {n} opens', { lesson: l.lesson, n: l.views })}</li>)}</ol></BaseCard>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
