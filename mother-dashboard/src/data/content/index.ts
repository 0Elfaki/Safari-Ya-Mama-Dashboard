import raw from './shared-content.json';
import type { Bilingual, DangerSign, Lesson, Lang } from '@/types';

/**
 * Health content generated from the shared content pack (see scripts/sync-content.mjs).
 * Every clinical sentence the dashboard shows comes from here, with its sources. Nothing is
 * written in components.
 */
export const content = {
  rulesVersion: raw.rulesVersion as string,
  pregnancySigns: raw.pregnancySigns as DangerSign[],
  postpartumSigns: raw.postpartumSigns as DangerSign[],
  babySigns: raw.babySigns as DangerSign[],
  vaccines: raw.vaccines as { dayOfLife: number; en: string; sw: string; items: string[] }[],
  ancContacts: raw.ancContacts as { week: number; en: string; sw: string; items: string[] }[],
  babySizes: raw.babySizes as { week: number; en: string; sw: string }[],
  pregnancyMonths: raw.pregnancyMonths as { month: number; baby: Bilingual; you: Bilingual }[],
  libraryCategories: raw.libraryCategories as { key: string; en: string; sw: string }[],
  lessons: raw.lessons as Lesson[],
  birthReadiness: raw.birthReadiness as { key: string; en: string; sw: string }[],
  assistantIntents: raw.assistantIntents as { keywords: string[]; urgent: 'red' | 'yellow' | null; en: string; sw: string }[],
  assistantDefault: raw.assistantDefault as Bilingual,
  diarySymptoms: raw.diarySymptoms as string[],
};

export const tr = (b: Bilingual | undefined, lang: Lang) => (b ? b[lang] || b.en : '');

export const lessonById = (id: string) => content.lessons.find((l) => l.id === id);

/** Signs that mean "go to a facility now" (red) vs "see a health worker today". */
export const urgentSigns = (list: DangerSign[]) => list.filter((s) => s.level === 'red');
export const todaySigns = (list: DangerSign[]) => list.filter((s) => s.level === 'yellow' || s.level === 'age');
