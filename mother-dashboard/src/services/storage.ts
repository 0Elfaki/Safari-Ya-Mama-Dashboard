import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * localStorage that never throws. Private windows, blocked site data or a full quota
 * turn writes into no-ops; read failures surface as a load error the UI can show.
 */
const safe: StateStorage = {
  getItem: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* storage unavailable: keep working in memory */
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export const localJSON = <T>() => createJSONStorage<T>(() => safe);

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
