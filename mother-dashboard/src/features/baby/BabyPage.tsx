import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { Baby, Droplets, Milk, Plus, Scale, Trash2, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { z } from 'zod';
import { DangerSignList } from '@/components/cards/DangerSignList';
import { Button, ButtonLink, IconButton } from '@/components/common/Button';
import { BaseCard, CardHeader } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/StateViews';
import { DemoBadge, StatusBadge } from '@/components/common/StatusBadge';
import { FormField, TextInput } from '@/components/forms/FormField';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { RecordsGate } from '@/components/layout/RecordsGate';
import { content } from '@/data/content';
import { useCare } from '@/hooks/useCare';
import { useRecords } from '@/store/records';
import type { FeedLog } from '@/types';
import { chart } from '@/utils/chartTheme';
import { addDays, daysBetween, fmtDate, fmtTime, isoDate, localDay, parseDate } from '@/utils/dates';

const feedKinds: { kind: FeedLog['kind']; label: string; icon: typeof Milk }[] = [
  { kind: 'breast', label: 'Breastfeed', icon: Milk },
  { kind: 'expressed', label: 'Expressed', icon: Droplets },
  { kind: 'other', label: 'Other feed', icon: UtensilsCrossed },
];

function FeedingTracker({ babyId }: { babyId: string }) {
  const feeds = useRecords((s) => s.feeds).filter((f) => f.babyId === babyId);
  const addFeed = useRecords((s) => s.addFeed);
  const removeFeed = useRecords((s) => s.removeFeed);
  const today = isoDate();
  const todays = feeds.filter((f) => localDay(f.at) === today);
  const data = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i - 6);
    const k = isoDate(d);
    return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }), feeds: feeds.filter((f) => localDay(f.at) === k).length };
  });
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <BaseCard aria-labelledby="feed-today">
        <CardHeader id="feed-today" icon={Milk} title="Today" subtitle={`${todays.length} feed${todays.length === 1 ? '' : 's'} logged`} headingLevel={3} />
        <div className="grid gap-3 sm:grid-cols-3">
          {feedKinds.map((k) => (
            <Button key={k.kind} variant={k.kind === 'breast' ? 'primary' : 'outline'} icon={k.icon} onClick={() => addFeed(k.kind)} block>
              {k.label}
            </Button>
          ))}
        </div>
        {todays.length === 0 ? (
          <EmptyState compact icon={Milk} title="No feeds logged today" text="Tap a button each time you feed." className="mt-4" />
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-line">
            {todays.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2">
                <span className="t-num w-14 font-semibold">{fmtTime(f.at)}</span>
                <span className="t-small flex-1">{feedKinds.find((k) => k.kind === f.kind)?.label}</span>
                <IconButton icon={Trash2} label={`Remove feed at ${fmtTime(f.at)}`} onClick={() => removeFeed(f.id)} />
              </li>
            ))}
          </ul>
        )}
        <p className="t-caption mt-4">The log is for you and your health worker. It does not judge whether your baby is feeding enough.</p>
      </BaseCard>
      <BaseCard aria-labelledby="feed-week">
        <CardHeader id="feed-week" icon={UtensilsCrossed} title="Last 7 days" subtitle="Feeds logged each day" headingLevel={3} />
        <div className="h-56" role="img" aria-label={`Feeds logged: ${data.map((d) => `${d.day} ${d.feeds}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={chart.grid} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={chart.tick} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={chart.tick} />
              <Tooltip cursor={{ fill: chart.primarySoft }} formatter={(v) => [v, 'Feeds']} {...chart.tooltip} />
              <Bar dataKey="feeds" fill={chart.primary} radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </BaseCard>
    </div>
  );
}

const growthSchema = z.object({
  date: z.string().min(1, 'Choose the date'),
  weightKg: z.coerce.number({ invalid_type_error: 'Enter the weight in kg' }).min(0.5, 'Check the weight (kg)').max(25, 'Check the weight (kg)'),
  lengthCm: z.union([z.literal(''), z.coerce.number().min(25, 'Check the length (cm)').max(120, 'Check the length (cm)')]).optional(),
});
type GrowthForm = z.input<typeof growthSchema>;

function GrowthTracker() {
  const baby = useRecords((s) => s.baby)!;
  const addGrowth = useRecords((s) => s.addGrowth);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState } = useForm<GrowthForm>({ resolver: zodResolver(growthSchema), defaultValues: { date: isoDate(), weightKg: '' as unknown as number, lengthCm: '' } });
  const birth = parseDate(baby.birthDate);
  const data = baby.growth.map((g) => ({ ...g, age: daysBetween(parseDate(g.date), birth) }));
  const onSubmit = handleSubmit((v) => {
    const parsed = growthSchema.parse(v);
    addGrowth({ date: parsed.date, weightKg: parsed.weightKg, lengthCm: parsed.lengthCm === '' ? undefined : parsed.lengthCm });
    setOpen(false);
    reset();
  });
  return (
    <BaseCard aria-labelledby="growth-title">
      <CardHeader
        id="growth-title"
        icon={Scale}
        title="Weight over time"
        subtitle="Weights recorded at visits"
        headingLevel={3}
        action={
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => setOpen(true)}>
            Add
          </Button>
        }
      />
      {data.length < 1 ? (
        <EmptyState compact icon={Scale} title="No weights recorded yet" text="Add the weight from the child health card after each visit." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="h-60 lg:col-span-3" role="img" aria-label={`Weight: ${data.map((d) => `${d.weightKg} kg at day ${d.age}`).join(', ')}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={chart.grid} />
                <XAxis dataKey="age" type="number" domain={[0, 'dataMax']} tickLine={false} axisLine={false} tick={chart.tick} tickFormatter={(d) => (d < 14 ? `${d}d` : `${Math.round(d / 7)}w`)} />
                <YAxis dataKey="weightKg" domain={['dataMin - 0.5', 'dataMax + 0.5']} tickLine={false} axisLine={false} tick={chart.tick} tickFormatter={(v) => `${Number(v).toFixed(1)}`} unit=" kg" width={64} />
                <Tooltip formatter={(v) => [`${v} kg`, 'Weight']} labelFormatter={(d) => `Day ${d}`} {...chart.tooltip} />
                <Line dataKey="weightKg" stroke={chart.primary} strokeWidth={3} dot={{ r: 4, fill: chart.surface, stroke: chart.primary, strokeWidth: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-col divide-y divide-line lg:col-span-2">
            {[...data].reverse().map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                <span className="t-num t-small">{fmtDate(g.date)}</span>
                <span className="t-num font-semibold">
                  {g.weightKg} kg{g.lengthCm ? ` · ${g.lengthCm} cm` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="t-caption mt-4">This chart shows recorded weights only. It does not compare them with growth standards. Ask your health worker to plot them on the child health card.</p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a growth record"
        description="Copy the values from the child health card."
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit}>Save</Button>
          </>
        }
      >
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField label="Date" required error={formState.errors.date?.message}>
            <TextInput type="date" max={isoDate()} {...register('date')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Weight (kg)" required error={formState.errors.weightKg?.message}>
              <TextInput inputMode="decimal" placeholder="e.g. 4.2" {...register('weightKg')} />
            </FormField>
            <FormField label="Length (cm)" error={formState.errors.lengthCm?.message}>
              <TextInput inputMode="decimal" {...register('lengthCm')} />
            </FormField>
          </div>
          <button type="submit" hidden />
        </form>
      </Modal>
    </BaseCard>
  );
}

function VaccinationSchedule() {
  const baby = useRecords((s) => s.baby)!;
  const toggle = useRecords((s) => s.toggleVaccine);
  const birth = parseDate(baby.birthDate);
  const today = new Date();
  return (
    <BaseCard padded={false}>
      <ul className="divide-y divide-line">
        {content.vaccines.map((v) => {
          const due = addDays(birth, v.dayOfLife);
          const n = daysBetween(due, today);
          const given = baby.vaccinesGiven.includes(v.dayOfLife);
          const st = given
            ? { tone: 'success' as const, label: 'Recorded as given' }
            : n <= 0
              ? { tone: 'warning' as const, label: 'Due now' }
              : n <= 14
                ? { tone: 'primary' as const, label: `Due in ${n} days` }
                : { tone: 'neutral' as const, label: 'Upcoming' };
          return (
            <li key={v.dayOfLife} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{v.en}</p>
                  <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                </div>
                <p className="t-small mt-1">{v.items.join(' · ')}</p>
                <p className="t-num t-caption mt-1">Around {fmtDate(isoDate(due))}</p>
              </div>
              <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-small font-semibold text-ink">
                <input type="checkbox" checked={given} onChange={() => toggle(v.dayOfLife)} className="h-5 w-5 accent-primary" />
                Given
              </label>
            </li>
          );
        })}
      </ul>
      <p className="t-caption border-t border-line px-5 py-3">Routine schedule as used in Tanzania. Always follow the child health card and your health worker.</p>
    </BaseCard>
  );
}

export function BabyPage() {
  const { baby, babyI, isDemo } = useCare();
  return (
    <RecordsGate title="My Baby">
      <PageHeader title="My Baby" subtitle="Your baby's profile, feeding, growth and vaccinations." eyebrow={isDemo ? <DemoBadge /> : undefined} />
      {!baby || !babyI ? (
        <BaseCard>
          <EmptyState
            icon={Baby}
            title="No baby profile yet"
            text="After your baby is born, add their birth date to start feeding, growth and vaccination tracking."
            action={<ButtonLink to="/profile#baby" size="sm">Add baby profile</ButtonLink>}
          />
        </BaseCard>
      ) : (
        <>
          <BaseCard aria-labelledby="baby-profile" className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft text-ink" aria-hidden>
              <Baby className="h-8 w-8" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="baby-profile" className="t-h2">
                {baby.name}
              </h2>
              <p className="t-small mt-1">{babyI.ageLabel}</p>
            </div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                ['Born', fmtDate(baby.birthDate)],
                ['Birth weight', baby.birthWeightKg ? `${baby.birthWeightKg} kg` : 'Not recorded'],
                ['Place of birth', baby.birthFacility || 'Not recorded'],
              ].map(([k, v]) => (
                <div key={k} className={clsx('min-w-0', k === 'Place of birth' && 'col-span-2 sm:col-span-1')}>
                  <dt className="t-label">{k}</dt>
                  <dd className="t-num mt-1 truncate font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </BaseCard>
          <section className="mt-10">
            <SectionHeader id="feeding" title="Feeding tracker" />
            <FeedingTracker babyId={baby.id} />
          </section>
          <section className="mt-10">
            <SectionHeader id="growth" title="Growth records" />
            <GrowthTracker />
          </section>
          <section className="mt-10">
            <SectionHeader id="vaccinations" title="Vaccination schedule" subtitle="Tick each group when the clinic records it on the child health card." />
            <VaccinationSchedule />
          </section>
        </>
      )}
      <section className="mt-10">
        <SectionHeader id="danger-signs" title="Newborn danger signs" />
        <DangerSignList signs={content.babySigns} who="babies" />
      </section>
    </RecordsGate>
  );
}
