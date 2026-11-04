import { content } from '@/data/content';
import type { BabyProfile, CareStage, MotherProfile } from '@/types';
import { addDays, daysBetween, isoDate, parseDate } from './dates';

/** Standard dating: 280 days from the first day of the last period. */
export const TERM_DAYS = 280;

export interface PregnancyInfo {
  gaDays: number;
  weeks: number;
  days: number;
  trimester: 1 | 2 | 3;
  progress: number; // 0..1
  edd: string;
  daysToGo: number;
  sizeEn: string;
}

/** Gestational age from the profile record. Returns null when the pregnancy is not dated. */
export function pregnancyInfo(m: MotherProfile | null, today = new Date()): PregnancyInfo | null {
  if (!m || m.deliveryDate) return null;
  let edd: Date | null = null;
  if (m.edd) edd = parseDate(m.edd);
  else if (m.lmp) edd = addDays(parseDate(m.lmp), TERM_DAYS);
  if (!edd) return null;
  const gaDays = TERM_DAYS - daysBetween(edd, today);
  if (gaDays < 0) return null;
  const weeks = Math.floor(gaDays / 7);
  const size = [...content.babySizes].reverse().find((s) => weeks >= s.week);
  return {
    gaDays,
    weeks,
    days: gaDays % 7,
    trimester: weeks < 14 ? 1 : weeks < 28 ? 2 : 3,
    progress: Math.min(1, gaDays / TERM_DAYS),
    edd: isoDate(edd),
    daysToGo: Math.max(0, daysBetween(edd, today)),
    sizeEn: size?.en ?? '',
  };
}

export interface BabyInfo {
  days: number;
  weeks: number;
  months: number;
  ageLabel: string;
  isNewborn: boolean; // first 28 days
}

export function babyInfo(b: BabyProfile | null, today = new Date()): BabyInfo | null {
  if (!b) return null;
  const days = Math.max(0, daysBetween(today, parseDate(b.birthDate)));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30.44);
  const ageLabel = days < 14 ? `${days} day${days === 1 ? '' : 's'} old` : days < 63 ? `${weeks} weeks old` : `${months} months old`;
  return { days, weeks, months, ageLabel, isNewborn: days <= 28 };
}

/** Care stage from the records: baby born → postpartum; 37+ weeks → birth soon; else pregnancy. */
export function careStage(m: MotherProfile | null, b: BabyProfile | null, today = new Date()): CareStage | null {
  if (!m) return null;
  if (m.deliveryDate || b) return 'postpartum';
  const p = pregnancyInfo(m, today);
  if (!p) return null;
  return p.weeks >= 37 ? 'birth-soon' : 'pregnancy';
}

export const stageLabel: Record<CareStage, string> = {
  pregnancy: 'Pregnancy',
  'birth-soon': 'Getting ready for birth',
  postpartum: 'After birth',
};

/** Next vaccine group on the routine schedule that is not recorded as given. */
export function nextVaccine(b: BabyProfile | null, today = new Date()) {
  if (!b) return null;
  const birth = parseDate(b.birthDate);
  const group = content.vaccines.find((v) => !b.vaccinesGiven.includes(v.dayOfLife));
  if (!group) return null;
  const due = addDays(birth, group.dayOfLife);
  return { group, due: isoDate(due), inDays: daysBetween(due, today) };
}
