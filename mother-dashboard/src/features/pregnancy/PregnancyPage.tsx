import clsx from 'clsx';
import { Baby, CalendarDays, Check, ClipboardList, Plus, Sprout } from 'lucide-react';
import { ArticleCard } from '@/components/cards/ArticleCard';
import { AppointmentCard } from '@/components/cards/AppointmentCard';
import { PregnancyProgressCard } from '@/components/cards/PregnancyProgressCard';
import { ButtonLink } from '@/components/common/Button';
import { BaseCard, CardHeader } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { EmptyState } from '@/components/common/StateViews';
import { DemoBadge, StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { RecordsGate } from '@/components/layout/RecordsGate';
import { content, tr } from '@/data/content';
import { useCare } from '@/hooks/useCare';
import { usePrefs } from '@/store/prefs';
import { useRecords } from '@/store/records';

const monthOf = (weeks: number) => Math.min(9, Math.floor(weeks / 4.35) + 1);

function Timeline({ weeks }: { weeks: number }) {
  const lang = usePrefs((s) => s.contentLang);
  const current = monthOf(weeks);
  return (
    <ol className="relative flex flex-col gap-4">
      {content.pregnancyMonths.map((m) => {
        const state = m.month < current ? 'past' : m.month === current ? 'now' : 'next';
        return (
          <li key={m.month} className="relative flex gap-4" aria-current={state === 'now' ? 'step' : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={clsx(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-display text-small font-bold',
                  state === 'past' && 'border-primary bg-primary text-white',
                  state === 'now' && 'border-primary bg-primary-soft text-primary',
                  state === 'next' && 'border-line bg-surface text-ink-2',
                )}
                aria-hidden
              >
                {state === 'past' ? <Check className="h-4 w-4" /> : m.month}
              </span>
              {m.month < 9 && <span className={clsx('mt-1 w-px flex-1', state === 'past' ? 'bg-primary' : 'bg-line')} aria-hidden />}
            </div>
            <div className={clsx('min-w-0 flex-1 rounded-lg border p-4', state === 'now' ? 'border-primary/30 bg-primary-soft' : 'border-line bg-surface')}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-body font-bold">Month {m.month}</p>
                {state === 'now' && <StatusBadge tone="primary" icon={null}>You are here</StatusBadge>}
              </div>
              <p className="t-small mt-2 text-ink">
                <span className="font-semibold">Baby: </span>
                {tr(m.baby, lang)}
              </p>
              <p className="t-small mt-1 text-ink">
                <span className="font-semibold">You: </span>
                {tr(m.you, lang)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function AncSchedule({ weeks }: { weeks: number }) {
  const nextIdx = content.ancContacts.findIndex((c) => c.week >= weeks);
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {content.ancContacts.map((c, i) => (
        <li key={c.week} className={clsx('min-w-0 rounded-md border p-4', i === nextIdx ? 'border-primary/30 bg-primary-soft' : 'border-line bg-surface')}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-ink">{c.en}</p>
            {i === nextIdx ? (
              <StatusBadge tone="primary" icon={CalendarDays}>
                Next
              </StatusBadge>
            ) : (
              <span className="t-num t-caption font-semibold">Week {c.week}</span>
            )}
          </div>
          {i === nextIdx && <p className="t-caption mt-1 font-semibold">Around week {c.week}</p>}
          <ul className="t-small mt-2 flex list-disc flex-col gap-1 pl-5">
            {c.items.slice(0, 4).map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function BirthPreparedness() {
  const lang = usePrefs((s) => s.contentLang);
  const ready = useRecords((s) => s.birthReady);
  const toggle = useRecords((s) => s.toggleBirthReady);
  const items = content.birthReadiness;
  const done = items.filter((i) => ready.includes(i.key)).length;
  return (
    <BaseCard aria-labelledby="ready-title">
      <CardHeader id="ready-title" icon={ClipboardList} title="Birth plan checklist" subtitle={`${done} of ${items.length} ready`} headingLevel={3} />
      <ProgressBar value={done / items.length} label="Birth preparedness" />
      <ul className="mt-4 flex flex-col gap-2">
        {items.map((i) => {
          const on = ready.includes(i.key);
          return (
            <li key={i.key}>
              <label className={clsx('flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 py-2', on ? 'border-success/20 bg-success-soft' : 'border-line')}>
                <input type="checkbox" checked={on} onChange={() => toggle(i.key)} className="h-5 w-5 shrink-0 accent-primary" />
                <span className={clsx('min-w-0 text-small font-medium', on ? 'text-ink-2' : 'text-ink')}>{tr(i, lang)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <ButtonLink to="/emergency" variant="secondary" size="sm" className="mt-4">
        Transport and contacts in your emergency plan
      </ButtonLink>
    </BaseCard>
  );
}

export function PregnancyPage() {
  const { stage, preg, babyI, isDemo, upcoming } = useCare();
  const lessons = content.lessons.filter((l) => l.category === 'preg');
  const anc = upcoming.filter((a) => a.type === 'antenatal');
  return (
    <RecordsGate title="My Pregnancy">
      <PageHeader title="My Pregnancy" subtitle="How your pregnancy is going, what comes next and how to get ready for birth." eyebrow={isDemo ? <DemoBadge /> : undefined} />
      {stage === 'postpartum' ? (
        <BaseCard>
          <EmptyState
            icon={Baby}
            title="Your baby has arrived"
            text="Your pregnancy pages are complete. Follow your baby's care and your recovery on My Baby and My Care."
            action={
              <>
                <ButtonLink to="/baby" size="sm">
                  Go to My Baby
                </ButtonLink>
                <ButtonLink to="/care" variant="outline" size="sm">
                  Go to My Care
                </ButtonLink>
              </>
            }
          />
        </BaseCard>
      ) : !preg || !stage ? (
        <BaseCard>
          <EmptyState icon={Sprout} title="Your pregnancy is not dated yet" text="Add your due date or the first day of your last period." action={<ButtonLink to="/profile#maternal" size="sm">Add dates</ButtonLink>} />
        </BaseCard>
      ) : (
        <>
          <PregnancyProgressCard stage={stage} preg={preg} babyI={babyI} demo={isDemo} />
          <div className="mt-10 grid gap-10 xl:grid-cols-5 xl:gap-6">
            <section className="min-w-0 xl:col-span-3">
              <SectionHeader id="timeline" title="Pregnancy timeline" subtitle="Month by month, for you and your baby." />
              <Timeline weeks={preg.weeks} />
            </section>
            <div className="flex min-w-0 flex-col gap-10 xl:col-span-2">
              <section>
                <SectionHeader id="birth-preparedness" title="Birth preparedness" />
                <BirthPreparedness />
              </section>
              <section>
                <SectionHeader
                  id="appointments"
                  title="Your antenatal visits"
                  action={
                    <ButtonLink to="/appointments?add=1" variant="ghost" size="sm" icon={Plus}>
                      Add
                    </ButtonLink>
                  }
                />
                {anc.length ? (
                  <ul className="flex flex-col gap-3">
                    {anc.map((a) => (
                      <li key={a.id}>
                        <AppointmentCard a={a} compact />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <BaseCard>
                    <EmptyState compact icon={CalendarDays} title="No antenatal visit booked" />
                  </BaseCard>
                )}
              </section>
            </div>
          </div>
          <section className="mt-10">
            <SectionHeader id="anc-schedule" title="Antenatal contacts" subtitle="The 8 contacts in the WHO 2016 antenatal care model. Your clinic may plan them differently." />
            <AncSchedule weeks={preg.weeks} />
          </section>
        </>
      )}
      <section className="mt-10">
        <SectionHeader id="education" title="Pregnancy education" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {lessons.map((l) => (
            <ArticleCard key={l.id} lesson={l} />
          ))}
        </div>
      </section>
    </RecordsGate>
  );
}
