import { content, lessonById } from '@/data/content';
import type { Appointment, BabyProfile, CareStage, ChecklistTask, MotherProfile } from '@/types';
import { daysBetween, fmtWeekday, parseDate } from '@/utils/dates';
import type { BabyInfo, PregnancyInfo } from '@/utils/pregnancy';
import { nextVaccine } from '@/utils/pregnancy';

/**
 * Today's care checklist, built only from the mother's records and the reviewed lessons.
 * - Supplements appear only when the clinic's prescription is recorded in her profile.
 * - Daily care items quote a lesson and say which one.
 * - Appointment items come from her own appointments.
 * Ticking items is a routine helper. It is never used to judge health.
 */
export interface ChecklistInput {
  mother: MotherProfile;
  baby: BabyProfile | null;
  stage: CareStage;
  preg: PregnancyInfo | null;
  babyI: BabyInfo | null;
  upcoming: Appointment[];
  today?: Date;
}

const fromLesson = (id: string) => `From the lesson “${lessonById(id)?.title.en ?? id}”`;

export function buildChecklist({ mother, baby, stage, preg, babyI, upcoming, today = new Date() }: ChecklistInput): ChecklistTask[] {
  const t: ChecklistTask[] = [];

  for (const s of mother.prescribedSupplements) {
    t.push({
      id: `supp:${s}`,
      category: 'supplement',
      title: `Take your ${s.toLowerCase()} tablet as prescribed`,
      basis: 'Prescribed by your clinic (recorded in your profile)',
      to: '/library/ifa',
    });
  }

  if (stage !== 'postpartum' && preg) {
    if (preg.weeks >= 28) {
      t.push({ id: 'kicks', category: 'daily', title: "Notice your baby's movements today", basis: fromLesson('kicks'), to: '/library/kicks' });
      t.push({ id: 'side-sleep', category: 'daily', title: 'Go to sleep on your side', basis: fromLesson('sleep-preg'), to: '/library/sleep-preg' });
    }
    t.push({ id: 'net', category: 'daily', title: 'Sleep under a treated mosquito net', basis: fromLesson('sleep-preg'), to: '/library/sleep-preg' });
    if (stage === 'birth-soon') {
      t.push({ id: 'bag', category: 'daily', title: 'Check your birth bag and clinic card are ready', basis: fromLesson('birth-plan'), to: '/pregnancy#birth-preparedness' });
    }
  }

  if (stage === 'postpartum' && baby && babyI) {
    t.push({ id: 'feeds', category: 'daily', title: "Log today's feeds", basis: fromLesson('breastfeed'), to: '/baby#feeding' });
    t.push({ id: 'back-sleep', category: 'daily', title: 'Lay your baby on their back for every sleep', basis: fromLesson('safe-sleep'), to: '/library/safe-sleep' });
    const v = nextVaccine(baby, today);
    if (v && v.inDays <= 7) {
      t.push({
        id: `vaccine:${v.group.dayOfLife}`,
        category: 'appointment',
        title: `${v.group.en} vaccines due ${v.inDays <= 0 ? 'now' : fmtWeekday(v.due)}`,
        basis: 'Routine schedule. Always follow the child health card.',
        to: '/baby#vaccinations',
      });
    }
  }

  for (const a of upcoming) {
    const n = daysBetween(parseDate(a.date), today);
    if (n < 0 || n > 1) continue;
    t.push({
      id: `appt:${a.id}`,
      category: 'appointment',
      title: `${n === 0 ? 'Today' : 'Tomorrow'} ${a.time}: ${a.title}`,
      basis: `${a.facility}. Bring your clinic card.`,
      to: `/appointments/${a.id}`,
    });
  }

  // one lesson a day, picked for the stage, rotating by date
  const pool = content.lessons.filter((l) => l.stage === 'all' || (stage === 'postpartum' ? l.stage === 'baby' : l.stage === 'pregnant'));
  if (pool.length) {
    const dayIndex = Math.floor(today.getTime() / 86_400_000);
    const l = pool[dayIndex % pool.length];
    t.push({ id: `learn:${l.id}`, category: 'education', title: `Read: ${l.title.en}`, basis: `${l.minutes} min lesson in the Health Library`, to: `/library/${l.id}` });
  }

  return t;
}

export const categoryLabel: Record<ChecklistTask['category'], string> = {
  daily: 'Daily care',
  supplement: 'Supplement',
  appointment: 'Appointment',
  education: 'Learning',
};
