import { useMemo } from 'react';
import { buildChecklist } from '@/features/dashboard/checklist';
import { useChecklist } from '@/store/checklist';
import { isoDate } from '@/utils/dates';
import { useCare } from './useCare';

/** Today's tasks with their ticked state, persisted per day on this device. */
export function useTodayChecklist() {
  const care = useCare();
  const date = isoDate();
  const doneIds = useChecklist((s) => s.done[date]);
  const toggle = useChecklist((s) => s.toggle);
  const tasks = useMemo(
    () => (care.mother && care.stage ? buildChecklist({ mother: care.mother, baby: care.baby, stage: care.stage, preg: care.preg, babyI: care.babyI, upcoming: care.upcoming }) : []),
    [care],
  );
  const done = new Set(doneIds ?? []);
  const doneCount = tasks.filter((t) => done.has(t.id)).length;
  return {
    tasks,
    isDone: (id: string) => done.has(id),
    toggle: (id: string) => toggle(date, id, tasks.map((t) => t.id)),
    doneCount,
    progress: tasks.length ? doneCount / tasks.length : 0,
  };
}
