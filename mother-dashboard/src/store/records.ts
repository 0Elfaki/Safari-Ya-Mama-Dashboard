import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { buildScenario, type Scenario } from '@/data/mock/scenarios';
import { localJSON, uid } from '@/services/storage';
import type { Appointment, BabyProfile, DiaryEntry, EmergencyContact, EmergencyPlan, FeedLog, GrowthRecord, MotherProfile } from '@/types';

/**
 * The mother's records on this device: profile, baby profile, appointments, emergency plan,
 * symptom diary and feeding log. Mother and baby are separate records linked by motherId.
 * This store is the seam for a future API: swap the persist storage for a sync adapter.
 */
interface RecordsState {
  mother: MotherProfile | null;
  baby: BabyProfile | null;
  appointments: Appointment[];
  plan: EmergencyPlan | null;
  diary: DiaryEntry[];
  feeds: FeedLog[];
  /** Birth-preparedness items she has ticked (keys from the content pack). */
  birthReady: string[];
  scenario: Scenario | null;
  hydrated: boolean;
  loadError: string | null;

  loadScenario: (s: Scenario) => void;
  clearAll: () => void;
  saveMother: (m: Omit<MotherProfile, 'id' | 'records' | 'source'> & Partial<Pick<MotherProfile, 'records'>>) => void;
  saveBaby: (b: Omit<BabyProfile, 'id' | 'motherId' | 'growth' | 'vaccinesGiven' | 'source'>) => void;
  removeBaby: () => void;
  addGrowth: (g: Omit<GrowthRecord, 'id' | 'source'>) => void;
  toggleVaccine: (dayOfLife: number) => void;
  addAppointment: (a: Omit<Appointment, 'id' | 'source'>) => void;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  removeAppointment: (id: string) => void;
  savePlan: (p: Omit<EmergencyPlan, 'contacts' | 'source'>) => void;
  addContact: (c: Omit<EmergencyContact, 'id'>) => void;
  removeContact: (id: string) => void;
  addDiary: (e: Omit<DiaryEntry, 'id'>) => void;
  removeDiary: (id: string) => void;
  addFeed: (kind: FeedLog['kind']) => void;
  removeFeed: (id: string) => void;
  toggleBirthReady: (key: string) => void;
}

const empty = { mother: null, baby: null, appointments: [], plan: null, diary: [], feeds: [], birthReady: [] as string[], scenario: null };
const emptyPlan = (): EmergencyPlan => ({ contacts: [], facility: { name: '' }, transport: { method: '', moneySaved: false }, source: 'user' });

export const useRecords = create<RecordsState>()(
  persist(
    (set, get) => ({
      ...empty,
      hydrated: false,
      loadError: null,

      loadScenario: (s) => set({ ...empty, ...buildScenario(s), birthReady: s === 'birth-soon' ? ['facility', 'companion', 'card'] : [], scenario: s }),
      clearAll: () => set({ ...empty }),

      saveMother: (m) => {
        const cur = get().mother;
        set({
          mother: {
            ...m,
            id: cur?.id ?? uid(),
            records: m.records ?? cur?.records ?? [],
            source: cur?.source === 'demo' ? 'demo' : 'user',
          },
        });
      },
      saveBaby: (b) => {
        const m = get().mother;
        if (!m) return;
        const cur = get().baby;
        set({
          baby: {
            ...b,
            id: cur?.id ?? uid(),
            motherId: m.id,
            growth: cur?.growth ?? [],
            vaccinesGiven: cur?.vaccinesGiven ?? [],
            source: cur?.source === 'demo' ? 'demo' : 'user',
          },
          mother: m.deliveryDate ? m : { ...m, deliveryDate: b.birthDate },
        });
      },
      removeBaby: () => set({ baby: null }),
      addGrowth: (g) => {
        const b = get().baby;
        if (!b) return;
        const growth = [...b.growth, { ...g, id: uid(), source: 'user' as const }].sort((x, y) => x.date.localeCompare(y.date));
        set({ baby: { ...b, growth } });
      },
      toggleVaccine: (day) => {
        const b = get().baby;
        if (!b) return;
        const has = b.vaccinesGiven.includes(day);
        set({ baby: { ...b, vaccinesGiven: has ? b.vaccinesGiven.filter((x) => x !== day) : [...b.vaccinesGiven, day] } });
      },

      addAppointment: (a) => set({ appointments: [...get().appointments, { ...a, id: uid(), source: 'user' }] }),
      updateAppointment: (id, patch) => set({ appointments: get().appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }),
      removeAppointment: (id) => set({ appointments: get().appointments.filter((a) => a.id !== id) }),

      savePlan: (p) => {
        const cur = get().plan ?? emptyPlan();
        set({ plan: { ...cur, ...p } });
      },
      addContact: (c) => {
        const cur = get().plan ?? emptyPlan();
        set({ plan: { ...cur, contacts: [...cur.contacts, { ...c, id: uid() }] } });
      },
      removeContact: (id) => {
        const cur = get().plan;
        if (cur) set({ plan: { ...cur, contacts: cur.contacts.filter((c) => c.id !== id) } });
      },

      addDiary: (e) => set({ diary: [{ ...e, id: uid() }, ...get().diary] }),
      removeDiary: (id) => set({ diary: get().diary.filter((e) => e.id !== id) }),

      addFeed: (kind) => {
        const b = get().baby;
        if (!b) return;
        set({ feeds: [{ id: uid(), babyId: b.id, at: new Date().toISOString(), kind }, ...get().feeds] });
      },
      removeFeed: (id) => set({ feeds: get().feeds.filter((f) => f.id !== id) }),
      toggleBirthReady: (key) => {
        const cur = get().birthReady;
        set({ birthReady: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] });
      },
    }),
    {
      name: 'sym-records-v1',
      storage: localJSON(),
      partialize: ({ mother, baby, appointments, plan, diary, feeds, birthReady, scenario }) => ({ mother, baby, appointments, plan, diary, feeds, birthReady, scenario }),
      // Hydration from localStorage can finish synchronously inside create(), before
      // `useRecords` exists, so the status update is deferred to a microtask.
      onRehydrateStorage: () => (_state, error) => {
        queueMicrotask(() =>
          useRecords.setState({
            hydrated: true,
            loadError: error ? 'Your saved records could not be read on this device.' : null,
          }),
        );
      },
    },
  ),
);

export const isDemo = (s: { source: string } | null | undefined) => s?.source === 'demo';
