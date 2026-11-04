import { lessonById } from '@/data/content';
import type { CareStage, Lesson } from '@/types';

/** Lesson picked for where she is. Falls back to the danger-signs lesson. */
export function featuredLessonFor(stage: CareStage | null, weeks?: number, babyDays?: number): Lesson {
  const id =
    stage === 'birth-soon' ? 'labour' : stage === 'postpartum' ? ((babyDays ?? 99) <= 28 ? 'breastfeed' : 'safe-sleep') : (weeks ?? 0) >= 28 ? 'kicks' : 'eat-well';
  return lessonById(id) ?? lessonById('danger-preg')!;
}
