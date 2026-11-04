import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { localJSON } from '@/services/storage';

/** Ticked checklist items per day, kept on this device. `history` keeps done/total per day for the weekly chart. */
interface ChecklistState {
  done: Record<string, string[]>;
  history: Record<string, { done: number; total: number }>;
  toggle: (date: string, id: string, taskIds: string[]) => void;
}

export const useChecklist = create<ChecklistState>()(
  persist(
    (set, get) => ({
      done: {},
      history: {},
      toggle: (date, id, taskIds) => {
        const cur = new Set(get().done[date] ?? []);
        if (cur.has(id)) cur.delete(id);
        else cur.add(id);
        const ids = taskIds.filter((t) => cur.has(t));
        // keep 60 days
        const keep = (o: Record<string, unknown>) => Object.keys(o).sort().slice(-60);
        const done = { ...get().done, [date]: ids };
        const history = { ...get().history, [date]: { done: ids.length, total: taskIds.length } };
        set({
          done: Object.fromEntries(keep(done).map((k) => [k, done[k]])),
          history: Object.fromEntries(keep(history).map((k) => [k, history[k]])),
        });
      },
    }),
    { name: 'sym-checklist-v1', storage: localJSON(), partialize: ({ done, history }) => ({ done, history }) },
  ),
);
