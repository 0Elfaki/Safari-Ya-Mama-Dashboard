import { CalendarDays, ClipboardCheck, FileHeart, HeartPulse } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ReminderCard } from '@/components/cards/ReminderCard';
import { BaseCard, CardHeader } from '@/components/common/Card';
import { EmptyState } from '@/components/common/StateViews';
import { DemoBadge, StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { RecordsGate } from '@/components/layout/RecordsGate';
import { useCare } from '@/hooks/useCare';
import { useChecklist } from '@/store/checklist';
import { chart } from '@/utils/chartTheme';
import { addDays, fmtDate, fmtWeekday, isoDate, relativeDays } from '@/utils/dates';
import { stageLabel } from '@/utils/pregnancy';
import { SymptomDiary } from './SymptomDiary';

function WeeklyChart() {
  const history = useChecklist((s) => s.history);
  const today = new Date();
  const data = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    const h = history[isoDate(d)];
    return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }), pct: h && h.total ? Math.round((h.done / h.total) * 100) : 0, has: !!h };
  });
  const any = data.some((d) => d.has);
  return (
    <BaseCard aria-labelledby="week-title">
      <CardHeader id="week-title" icon={ClipboardCheck} title="Last 7 days" subtitle="Share of each day's checklist ticked on this device" headingLevel={3} />
      {any ? (
        <div className="h-48" role="img" aria-label={`Checklist completion: ${data.map((d) => `${d.day} ${d.pct}%`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={chart.grid} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={chart.tick} />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={chart.tick} />
              <Tooltip cursor={{ fill: chart.primarySoft }} formatter={(v) => [`${v}%`, 'Ticked']} {...chart.tooltip} />
              <Bar dataKey="pct" fill={chart.primary} radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState compact icon={ClipboardCheck} title="No history yet" text="Tick items on today's checklist to start your history." />
      )}
    </BaseCard>
  );
}

export function MyCarePage() {
  const { mother, stage, upcoming, isDemo } = useCare();
  const records = [...(mother?.records ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  const nextVisit = upcoming.find((a) => a.forWhom === 'mother');
  return (
    <RecordsGate title="My Care" subtitle="Your health overview, records, diary and daily care.">
      <PageHeader title="My Care" subtitle="Your health overview, records, diary and daily care." eyebrow={isDemo ? <DemoBadge /> : undefined} />

      <section aria-label="Maternal health overview" className="grid gap-4 sm:grid-cols-3">
        <BaseCard className="flex items-center gap-4">
          <HeartPulse className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="t-label">Care stage</p>
            <p className="mt-1 truncate font-semibold">{stage ? stageLabel[stage] : 'Not dated yet'}</p>
          </div>
        </BaseCard>
        <BaseCard className="flex items-center gap-4">
          <CalendarDays className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="t-label">Next visit</p>
            <p className="mt-1 truncate font-semibold">{nextVisit ? `${fmtWeekday(nextVisit.date)} · ${relativeDays(nextVisit.date)}` : 'None booked'}</p>
          </div>
        </BaseCard>
        <BaseCard className="flex items-center gap-4">
          <FileHeart className="h-6 w-6 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="t-label">Health records</p>
            <p className="mt-1 truncate font-semibold">{records.length ? `${records.length} on file` : 'None yet'}</p>
          </div>
        </BaseCard>
      </section>

      <div className="mt-10 grid gap-10 xl:grid-cols-2 xl:gap-6">
        <section className="min-w-0">
          <SectionHeader id="history" title="Health history" subtitle="Records from your clinic visits." />
          <BaseCard padded={false}>
            {records.length === 0 ? (
              <EmptyState icon={FileHeart} title="No health records yet" text="Records from your clinic appear here once your account is connected to your clinic." />
            ) : (
              <ul className="divide-y divide-line">
                {records.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{r.label}</p>
                      <p className="t-num t-small">{r.value}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                      <p className="t-num t-small">{fmtDate(r.date)}</p>
                      <div className="flex gap-2">
                        <StatusBadge tone="neutral" icon={null}>
                          {r.recordedBy === 'clinic' ? 'Clinic' : 'You'}
                        </StatusBadge>
                        {r.source === 'demo' && <DemoBadge />}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </BaseCard>
          <p className="t-caption mt-3">Values are shown as recorded. Ask your health worker what they mean for you.</p>
        </section>

        <section className="min-w-0">
          <SectionHeader id="diary" title="Symptom diary" />
          <BaseCard>
            <SymptomDiary />
          </BaseCard>
        </section>
      </div>

      <section className="mt-10">
        <SectionHeader id="reminders" title="Care reminders" subtitle="Today's checklist and how the week went." />
        <div className="grid gap-6 xl:grid-cols-2">
          <ReminderCard />
          <WeeklyChart />
        </div>
      </section>

    </RecordsGate>
  );
}
