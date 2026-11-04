import clsx from 'clsx';
import { ArrowRight, Baby, CalendarHeart } from 'lucide-react';
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { ButtonLink } from '../common/Button';
import { DemoBadge, StatusBadge } from '../common/StatusBadge';
import { Illustration } from '../common/Illustration';
import { chart } from '@/utils/chartTheme';
import { fmtDate } from '@/utils/dates';
import type { BabyInfo, PregnancyInfo } from '@/utils/pregnancy';
import type { CareStage } from '@/types';

/** Ring chart with the main number in the middle. */
export function ProgressRing({ value, big, small, label }: { value: number; big: string; small: string; label: string }) {
  return (
    <div className="relative h-40 w-40 shrink-0" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="78%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{ v: Math.round(value * 100) }]} barSize={14}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
          <RadialBar dataKey="v" cornerRadius={999} fill={chart.primary} background={{ fill: chart.primarySoft }} isAnimationActive={false} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="t-num font-display text-display font-extrabold leading-none text-ink">{big}</span>
        <span className="t-caption mt-1 font-semibold">{small}</span>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="t-label">{label}</dt>
      <dd className="t-num mt-1 truncate font-semibold text-ink">{value}</dd>
    </div>
  );
}

/** Three trimester segments, the current one filled up to today. */
function TrimesterTrack({ weeks }: { weeks: number }) {
  const seg = [
    { n: 1, from: 0, to: 14, label: 'Weeks 1–13' },
    { n: 2, from: 14, to: 28, label: 'Weeks 14–27' },
    { n: 3, from: 28, to: 40, label: 'Weeks 28–40' },
  ];
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Trimesters">
      {seg.map((s) => {
        const fill = Math.max(0, Math.min(1, (weeks - s.from) / (s.to - s.from)));
        const current = weeks >= s.from && weeks < s.to;
        return (
          <li key={s.n} className="min-w-0" aria-current={current ? 'step' : undefined}>
            <div className="h-2 overflow-hidden rounded-full bg-primary-soft">
              <div className="h-full rounded-full bg-primary" style={{ width: `${fill * 100}%` }} />
            </div>
            <p className={clsx('mt-2 truncate text-caption', current ? 'font-bold text-ink' : 'text-ink-2')}>Trimester {s.n}</p>
            <p className="t-caption hidden truncate sm:block">{s.label}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** Home hero: gestational age and stage in pregnancy, or baby age and postnatal week after birth. */
export function PregnancyProgressCard({ stage, preg, babyI, babyName, demo }: { stage: CareStage; preg: PregnancyInfo | null; babyI: BabyInfo | null; babyName?: string; demo: boolean }) {
  if (stage === 'postpartum' && babyI) {
    const pnWeek = Math.min(6, Math.floor(babyI.days / 7) + 1);
    const inPostnatal = babyI.days < 42;
    return (
      <section aria-labelledby="stage-title" className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6">
          <ProgressRing
            value={inPostnatal ? babyI.days / 42 : Math.min(1, babyI.days / 365)}
            big={babyI.days < 63 ? String(babyI.weeks) : String(babyI.months)}
            small={babyI.days < 63 ? 'weeks old' : 'months old'}
            label={`${babyName ?? 'Baby'} is ${babyI.ageLabel}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="primary" icon={Baby}>
                After birth
              </StatusBadge>
              {demo && <DemoBadge />}
            </div>
            <h2 id="stage-title" className="t-h2 mt-3">
              {babyName ?? 'Your baby'} is {babyI.ageLabel}
            </h2>
            <p className="t-small mt-1">{inPostnatal ? `You are in week ${pnWeek} of the 6-week postnatal period.` : 'The 6-week postnatal period is complete.'}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <Fact label="Baby's age" value={babyI.ageLabel} />
              <Fact label="Care stage" value={inPostnatal ? 'Postnatal care' : 'Infant care'} />
            </dl>
            <ButtonLink to="/baby" variant="secondary" iconRight={ArrowRight} className="mt-5">
              View baby details
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  if (!preg) return null;
  return (
    <section aria-labelledby="stage-title" className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[auto_1fr_auto] xl:items-center">
        <div className="flex flex-col items-start gap-4 xs:flex-row xs:items-center xs:gap-5">
          <ProgressRing value={preg.progress} big={String(preg.weeks)} small={preg.days ? `weeks + ${preg.days} d` : 'weeks'} label={`Pregnancy progress: ${preg.weeks} weeks ${preg.days} days of 40 weeks`} />
          <div className="min-w-0 xl:hidden">
            <StageBadges stage={stage} demo={demo} />
          </div>
        </div>
        <div className="min-w-0">
          <div className="hidden xl:block">
            <StageBadges stage={stage} demo={demo} />
          </div>
          <h2 id="stage-title" className="t-h2 xl:mt-3">
            {preg.weeks} weeks{preg.days ? `, ${preg.days} day${preg.days === 1 ? '' : 's'}` : ''}
          </h2>
          {preg.sizeEn && <p className="t-small mt-1">Your baby is about the size of a {preg.sizeEn}.</p>}
          <dl className="mt-5 grid grid-cols-3 gap-4">
            <Fact label="Trimester" value={`${preg.trimester} of 3`} />
            <Fact label="Due date" value={fmtDate(preg.edd, { day: 'numeric', month: 'short' })} />
            <Fact label="To go" value={`${preg.daysToGo} days`} />
          </dl>
          <div className="mt-5">
            <TrimesterTrack weeks={preg.weeks} />
          </div>
          <ButtonLink to="/pregnancy" variant="secondary" iconRight={ArrowRight} className="mt-5">
            View pregnancy details
          </ButtonLink>
        </div>
        <Illustration name="mother_belly" className="hidden h-40 w-56 rounded-lg bg-accent-soft p-3 xl:block" />
      </div>
      <p className="t-caption border-t border-line bg-surface-2 px-5 py-3 sm:px-6">
        <CalendarHeart className="mr-1 inline h-4 w-4 align-text-bottom text-primary" aria-hidden />
        Dated from {demo ? 'the demo profile record' : 'your profile record'}. Your clinic's dating always takes priority.
      </p>
    </section>
  );
}

function StageBadges({ stage, demo }: { stage: CareStage; demo: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge tone="primary" icon={null}>
        {stage === 'birth-soon' ? 'Getting ready for birth' : 'Pregnancy'}
      </StatusBadge>
      {demo && <DemoBadge />}
    </div>
  );
}
