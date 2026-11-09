import { Activity, Baby, CalendarX, Clock, HeartPulse, Siren, Stethoscope, Users } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { BookingKpis } from '@/components/CareKpis';
import { Chips, Kpi } from '@/components/ui/Bits';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { childKpis, facilityDaily, facilityKpis } from '@/lib/api';
import { daysAgo, fmtPct, isoDay, signLabel } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';

const DailyChart = lazy(() => import('@/features/admin/charts').then((m) => ({ default: m.ChecksChart })));

export default function FacilityOverviewPage() {
  const { facility } = useSession();
  const t = useT();
  const [range, setRange] = useState<'7' | '30' | '90'>('30');
  const from = daysAgo(Number(range) - 1), to = isoDay();
  const { data, loading, error, reload } = useAsync(async () => {
    const [k, d, c] = await Promise.all([facilityKpis(facility!.id, from, to), facilityDaily(facility!.id, from, to), childKpis(facility!.id, from, to)]);
    return { k, d, c };
  }, [facility!.id, from, to]);

  return (
    <>
      <PageHeader title={t('Facility KPIs')} subtitle={`${facility!.name} · ${t('mothers who share their records with this facility.')}`}
        actions={<Chips label={t('Period')} value={range} onChange={setRange} options={[{ value: '7', label: t('7 days') }, { value: '30', label: t('30 days') }, { value: '90', label: t('90 days') }]} />} />
      {loading ? <LoadingState text={t('Loading figures…')} /> : error || !data ? <ErrorState text={error ?? ''} onRetry={() => reload()} /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label={t('Mothers sharing')} icon={Users} value={data.k?.mothers_sharing ?? 0} />
            <Kpi label={t('Check-ins')} icon={HeartPulse} value={data.k?.checkins ?? 0} />
            <Kpi label={t('Red alerts')} icon={Siren} value={data.k?.red_alerts ?? 0} tone={data.k?.red_alerts ? 'danger' : undefined} />
            <Kpi label={t('Amber alerts')} icon={Activity} value={data.k?.amber_alerts ?? 0} tone={data.k?.amber_alerts ? 'warning' : undefined} />
            <Kpi label={t('Median time to acknowledge')} icon={Clock} value={data.k?.median_ack_minutes == null ? '—' : t('{n} min', { n: Math.round(data.k.median_ack_minutes) })} />
            <Kpi label={t('With 4+ ANC contacts')} icon={Stethoscope} value={fmtPct(data.k?.anc4_rate)} />
            <Kpi label={t('Visits not recorded')} icon={CalendarX} value={data.k?.visits_missed ?? 0} sub={t('due in this period')} />
            <Kpi label={t('Children checked')} icon={Baby} value={data.c?.children ?? 0} sub={t('{n} child checks', { n: data.c?.checks ?? 0 })} />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <BaseCard>
              <CardHeader icon={HeartPulse} title={t('Check-ins per day')} subtitle={t('Red and amber results shown in their own colour, with their name in the legend.')} />
              <Suspense fallback={<LoadingState text={t('Drawing chart…')} />}><DailyChart rows={data.d} /></Suspense>
            </BaseCard>
            <BaseCard>
              <CardHeader icon={Baby} title={t('Child daily checks')} subtitle={t('Babies of mothers who share. The signs mothers ticked most.')} />
              {!data.c || data.c.checks === 0 ? <p className="t-small">{t('No child checks in this period.')}</p> : (
                <>
                  <p className="text-small text-ink"><b>{data.c.green}</b> {t('no warning signs')} · <b className="text-warning">{data.c.amber}</b> {t('amber')} · <b className="text-danger">{data.c.red}</b> {t('red')}</p>
                  <ul className="mt-4 flex flex-col gap-2">
                    {data.c.top_signs.map((s) => (
                      <li key={s.sign} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-small">
                        <span className="truncate text-ink">{signLabel(s.sign)}</span><span className="t-num font-semibold text-ink">{s.n}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </BaseCard>
          </div>
        </>
      )}
      <section className="mt-8"><h2 className="t-h3 mb-3">{t('Appointments and video calls')}</h2><BookingKpis facility={facility!.id} from={from} to={to} /></section>
    </>
  );
}
