import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, CalendarDays, FlaskConical, Plus, UserRoundPlus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArticleCard } from '@/components/cards/ArticleCard';
import { AppointmentCard, AppointmentsEmpty } from '@/components/cards/AppointmentCard';
import { EmergencyCard } from '@/components/cards/EmergencyCard';
import { BabyHealthCard, MaternalHealthCard } from '@/components/cards/HealthProfileCards';
import { MamaBotCard } from '@/components/cards/MamaBotCard';
import { PregnancyProgressCard } from '@/components/cards/PregnancyProgressCard';
import { ReminderCard } from '@/components/cards/ReminderCard';
import { Button, ButtonLink } from '@/components/common/Button';
import { BaseCard, CardHeader } from '@/components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/StateViews';
import { Illustration } from '@/components/common/Illustration';
import { Avatar } from '@/components/layout/Topbar';
import { SyncStatus } from '@/components/layout/SyncStatus';
import { featuredLessonFor } from '@/features/education/featured';
import { useCare, useDataStatus } from '@/hooks/useCare';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useRecords } from '@/store/records';
import { useUi } from '@/store/ui';
import { fmtLongToday, greeting } from '@/utils/dates';

function WelcomeHeader({ name }: { name: string }) {
  return (
    <div className="mb-6 flex items-center gap-4 lg:mb-8">
      <span className="hidden sm:inline-flex">
        <Avatar name={name} size="lg" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="t-small">{fmtLongToday()}</p>
        <h1 className="t-h1 mt-1 sm:text-display">
          {greeting()}, {name || 'Mama'}.
        </h1>
        <p className="t-body mt-1 text-ink-2">Your health journey matters. Let's take care of you and your baby today.</p>
      </div>
    </div>
  );
}

function UpcomingCard() {
  const { upcoming } = useCare();
  return (
    <BaseCard aria-labelledby="upcoming-title">
      <CardHeader
        id="upcoming-title"
        icon={CalendarDays}
        title="Upcoming appointments"
        action={
          <Link to="/appointments" className="inline-flex min-h-11 items-center text-small font-semibold text-primary hover:underline">
            View all
          </Link>
        }
      />
      {upcoming.length === 0 ? (
        <>
          <AppointmentsEmpty />
          <ButtonLink to="/appointments?add=1" variant="secondary" icon={Plus} block>
            Add appointment
          </ButtonLink>
        </>
      ) : (
        <ul className="flex flex-col gap-3">
          {upcoming.slice(0, 2).map((a) => (
            <li key={a.id}>
              <AppointmentCard a={a} compact />
            </li>
          ))}
        </ul>
      )}
    </BaseCard>
  );
}

function EducationCard() {
  const { stage, preg, babyI } = useCare();
  const lesson = featuredLessonFor(stage, preg?.weeks, babyI?.days);
  return (
    <section aria-labelledby="learn-title" className="min-w-0">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 id="learn-title" className="t-h2">
          For you this week
        </h2>
        <Link to="/library" className="inline-flex min-h-11 items-center gap-1 text-small font-semibold text-primary hover:underline">
          Health Library <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <ArticleCard lesson={lesson} featured />
    </section>
  );
}

const Reveal = ({ children, i }: { children: ReactNode; i: number }) => (
  <motion.div className="min-w-0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(i, 6) * 0.04 }}>
    {children}
  </motion.div>
);

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading your dashboard" className="grid gap-6 xl:grid-cols-3">
      <div className="flex flex-col gap-6 xl:col-span-2">
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}

/** First run: no profile yet. Emergency help and lessons still work without one. */
function DashboardEmpty() {
  const loadScenario = useRecords((s) => s.loadScenario);
  const setPreview = useUi((s) => s.setPreview);
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
        <BaseCard className="overflow-hidden p-0 sm:p-0">
          <div className="flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
            <Illustration name="mother_baby" className="h-32 w-48 shrink-0 rounded-lg bg-accent-soft p-3" />
            <div className="min-w-0">
              <h2 className="t-h2">Set up your profile</h2>
              <p className="t-body mt-2 text-ink-2">Add your due date or your baby's birth date. Your dashboard, checklist and lessons then follow your stage.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
                <ButtonLink to="/profile" icon={UserRoundPlus}>
                  Set up my profile
                </ButtonLink>
                <Button
                  variant="outline"
                  icon={FlaskConical}
                  onClick={() => {
                    setPreview('live');
                    loadScenario('pregnant');
                  }}
                >
                  Explore with demo data
                </Button>
              </div>
            </div>
          </div>
        </BaseCard>
        <BaseCard>
          <EmptyState icon={BookOpen} title="Lessons are ready now" text="The Health Library works without a profile." action={<ButtonLink to="/library" variant="secondary" size="sm">Open Health Library</ButtonLink>} />
        </BaseCard>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <EmergencyCard stage={null} />
        <MamaBotCard />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const status = useDataStatus();
  const care = useCare();
  const wide = useMediaQuery('(min-width: 1280px)');

  if (status === 'loading')
    return (
      <>
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-8 w-64" />
          </div>
        </div>
        <DashboardSkeleton />
      </>
    );

  if (status === 'error')
    return (
      <>
        <WelcomeHeader name="" />
        <div className="grid gap-6 xl:grid-cols-3">
          <ErrorState className="xl:col-span-2" title="Your records could not be loaded" text="Your saved records could not be read on this device. Emergency help below still works." onRetry={() => window.location.reload()} />
          <EmergencyCard stage={null} />
        </div>
      </>
    );

  if (status === 'empty' || !care.mother)
    return (
      <>
        <WelcomeHeader name="" />
        <DashboardEmpty />
      </>
    );

  const undated = !care.stage;
  const hero = undated ? (
    <BaseCard>
      <EmptyState icon={CalendarDays} title="Your pregnancy is not dated yet" text="Add your due date or the first day of your last period to see your progress." action={<ButtonLink to="/profile#maternal" size="sm">Add dates</ButtonLink>} />
    </BaseCard>
  ) : (
    <PregnancyProgressCard stage={care.stage!} preg={care.preg} babyI={care.babyI} babyName={care.baby?.name} demo={care.isDemo} />
  );
  const profiles = (
    <div className="grid gap-6 md:grid-cols-2">
      <MaternalHealthCard />
      <BabyHealthCard />
    </div>
  );
  const emergency = <EmergencyCard stage={care.stage} />;

  const header = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <WelcomeHeader name={care.firstName} />
      <SyncStatus className="mb-6 sm:mt-2 xl:hidden" />
    </div>
  );

  if (wide)
    return (
      <>
        {header}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 flex min-w-0 flex-col gap-6">
            {[hero, profiles, <ReminderCard key="r" />, <EducationCard key="e" />].map((c, i) => (
              <Reveal key={i} i={i}>
                {c}
              </Reveal>
            ))}
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            {[emergency, <UpcomingCard key="u" />, <MamaBotCard key="m" />].map((c, i) => (
              <Reveal key={i} i={i + 1}>
                {c}
              </Reveal>
            ))}
          </div>
        </div>
      </>
    );

  return (
    <>
      {header}
      <div className="flex flex-col gap-6">
        {[
          hero,
          <ReminderCard key="r" />,
          profiles,
          emergency,
          <div key="um" className="grid gap-6 md:grid-cols-2">
            <UpcomingCard />
            <MamaBotCard />
          </div>,
          <EducationCard key="e" />,
        ].map((c, i) => (
          <Reveal key={i} i={i}>
            {c}
          </Reveal>
        ))}
      </div>
    </>
  );
}
