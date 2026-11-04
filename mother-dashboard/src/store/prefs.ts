import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { localJSON } from '@/services/storage';
import type { Lang } from '@/types';

/** Per-device preferences. */
interface PrefsState {
  contentLang: Lang;
  textSize: 'default' | 'large';
  reduceMotion: boolean;
  sidebarCollapsed: boolean;
  reminders: { appointments: boolean; dayBefore: boolean; checklist: boolean };
  consent: { shareWithHealthWorker: boolean; usageStats: boolean };
  readNotifications: string[];
  set: (patch: Partial<Omit<PrefsState, 'set' | 'markRead'>>) => void;
  markRead: (ids: string[]) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      contentLang: 'en',
      textSize: 'default',
      reduceMotion: false,
      sidebarCollapsed: false,
      reminders: { appointments: true, dayBefore: true, checklist: true },
      consent: { shareWithHealthWorker: false, usageStats: false },
      readNotifications: [],
      set: (patch) => set(patch),
      markRead: (ids) => set({ readNotifications: Array.from(new Set([...get().readNotifications, ...ids])).slice(-200) }),
    }),
    { name: 'sym-prefs-v1', storage: localJSON(), partialize: ({ set: _s, markRead: _m, ...rest }) => rest },
  ),
);
