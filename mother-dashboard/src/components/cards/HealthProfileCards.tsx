import { Baby, CalendarDays, FileHeart, HeartPulse, NotebookPen, Scale, Syringe, UserRound, UtensilsCrossed } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { content, tr } from '@/data/content';
import { useCare } from '@/hooks/useCare';
import { usePrefs } from '@/store/prefs';
import { useRecords } from '@/store/records';
import { chart } from '@/utils/chartTheme';
import { fmtDate, fmtWeekday, isoDate, localDay, relativeDays } from '@/utils/dates';
import { ButtonLink } from '../common/Button';
import { BaseCard, CardHeader, LinkRow } from '../common/Card';
import { DemoBadge } from '../common/StatusBadge';

/** "My Health": maternal profile, latest records, next antenatal/postnatal visit, symptom diary. */
export function MaternalHealthCard() {
  const { mother, upcoming, isDemo, stage } = useCare();
  const diary = useRecords((s) => s.diary);
  if (!mother) return null;
  const latest = [...mother.records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
  const nextVisit = upcoming.find((a) => a.forWhom === 'mother');
  return (
    <BaseCard aria-labelledby="my-health" className="flex flex-col">
      <CardHeader id="my-health" icon={HeartPulse} title="My Health" subtitle={stage === 'postpartum' ? 'Your recovery after birth' : 'Your pregnancy health'} badge={isDemo ? <DemoBadge /> : undefined} />
      <div className="-mx-3 flex flex-col">
        <LinkRow to="/profile#maternal" icon={UserRound} title="Maternal profile" detail={mother.name || 'Add your details'} />
        <LinkRow
          to="/care#history"
          icon={FileHeart}
          title="Recent health records"
          detail={latest.length ? latest.map((r) => `${r.label} ${r.value}`).join(' · ') : 'No records yet'}
        />
        <LinkRow
          to={nextVisit ? `/appointments/${nextVisit.id}` : '/appointments'}
          icon={CalendarDays}
          title={stage === 'postpartum' ? 'Next postnatal visit' : 'Next antenatal visit'}
          detail={nextVisit ? `${fmtWeekday(nextVisit.date)} · ${relativeDays(nextVisit.date)}` : 'None booked'}
        />
        <LinkRow to="/care#diary" icon={NotebookPen} title="Symptom diary" detail={diary[0] ? `Last entry ${fmtDate(localDay(diary[0].date))}` : 'Write how you feel today'} />
      </div>
    </BaseCard>
  );
}

/** "My Baby": the baby's profile after birth; before birth, how the baby is growing. */
export function BabyHealthCard() {
  const { baby, babyI, preg, vaccine, isDemo, stage } = useCare();
  const feeds = useRecords((s) => s.feeds);
  const lang = usePrefs((s) => s.contentLang);

  if (stage !== 'postpartum' || !baby || !babyI) {
    const month = preg ? Math.min(9, Math.floor(preg.weeks / 4.35) + 1) : null;
    const m = content.pregnancyMonths.find((x) => x.month === month);
    return (
      <BaseCard aria-labelledby="my-baby" className="flex flex-col">
        <CardHeader id="my-baby" icon={Baby} title="My Baby" subtitle={month ? `Month ${month} of pregnancy` : 'Baby on the way'} tone="accent" />
        {m ? (
          <p className="t-body text-ink">{tr(m.baby, lang)}</p>
        ) : (
          <p className="t-small">Add your due date to your profile to follow your baby's growth.</p>
        )}
        <p className="t-small mt-3">Your baby's own profile, feeding, growth and vaccines start here after birth.</p>
        <div className="mt-auto flex flex-wrap gap-3 pt-5">
          <ButtonLink to="/pregnancy#timeline" variant="secondary" size="sm">
            Pregnancy timeline
          </ButtonLink>
          <ButtonLink to="/profile#baby" variant="outline" size="sm">
            Add baby after birth
          </ButtonLink>
        </div>
      </BaseCard>
    );
  }

  const today = isoDate();
  const feedsToday = feeds.filter((f) => f.babyId === baby.id && localDay(f.at) === today).length;
  const lastGrowth = baby.growth[baby.growth.length - 1];
  return (
    <BaseCard aria-labelledby="my-baby" className="flex flex-col">
      <CardHeader id="my-baby" icon={Baby} title="My Baby" subtitle={`${baby.name}, ${babyI.ageLabel}`} tone="accent" badge={isDemo ? <DemoBadge /> : undefined} />
      <dl className="grid grid-cols-2 gap-4 rounded-md bg-surface-2 p-4">
        <div className="min-w-0">
          <dt className="t-label">Born</dt>
          <dd className="t-num mt-1 truncate font-semibold">{fmtDate(baby.birthDate, { day: 'numeric', month: 'short' })}</dd>
        </div>
        <div className="min-w-0">
          <dt className="t-label">Birth weight</dt>
          <dd className="t-num mt-1 truncate font-semibold">{baby.birthWeightKg ? `${baby.birthWeightKg} kg` : 'Not recorded'}</dd>
        </div>
      </dl>
      <div className="-mx-3 mt-2 flex flex-col">
        <LinkRow to="/baby#feeding" icon={UtensilsCrossed} title="Feeding tracker" detail={`${feedsToday} feed${feedsToday === 1 ? '' : 's'} logged today`} />
        <LinkRow
          to="/baby#growth"
          icon={Scale}
          title="Growth tracker"
          detail={lastGrowth ? `${lastGrowth.weightKg} kg on ${fmtDate(lastGrowth.date, { day: 'numeric', month: 'short' })}` : 'No weights yet'}
          trailing={
            baby.growth.length > 1 ? (
              <span className="hidden h-8 w-16 xs:block" aria-hidden>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={baby.growth}>
                    <Line dataKey="weightKg" stroke={chart.primary} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </span>
            ) : undefined
          }
        />
        <LinkRow
          to="/baby#vaccinations"
          icon={Syringe}
          title="Vaccination schedule"
          detail={vaccine ? `${vaccine.group.en}: ${vaccine.inDays < 0 ? 'due now' : relativeDays(vaccine.due).toLowerCase()}` : 'Routine schedule complete'}
        />
      </div>
    </BaseCard>
  );
}
