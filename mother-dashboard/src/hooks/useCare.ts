import { useMemo } from 'react';
import { useRecords } from '@/store/records';
import { useUi } from '@/store/ui';
import { babyInfo, careStage, nextVaccine, pregnancyInfo } from '@/utils/pregnancy';
import { isoDate, parseDate } from '@/utils/dates';

/**
 * Everything a screen needs to adapt to where the mother is: profile records, derived
 * pregnancy / baby facts and the care stage. All values come from the stored profile records.
 */
export function useCare() {
  const mother = useRecords((s) => s.mother);
  const baby = useRecords((s) => s.baby);
  const appointments = useRecords((s) => s.appointments);
  return useMemo(() => {
    const today = new Date();
    const preg = pregnancyInfo(mother, today);
    const babyI = babyInfo(baby, today);
    const stage = careStage(mother, baby, today);
    const todayIso = isoDate(today);
    const upcoming = appointments
      .filter((a) => a.date >= todayIso && (a.status === 'scheduled' || a.status === 'confirmed'))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const past = appointments.filter((a) => !upcoming.includes(a)).sort((a, b) => b.date.localeCompare(a.date));
    return {
      mother,
      baby,
      stage,
      preg,
      babyI,
      vaccine: nextVaccine(baby, today),
      upcoming,
      past,
      isDemo: mother?.source === 'demo',
      firstName: mother?.name.trim().split(/\s+/)[0] || '',
    };
  }, [mother, baby, appointments]);
}

/** Data status for screens: real hydration / read errors, or a design-review preview. */
export function useDataStatus(): 'loading' | 'error' | 'empty' | 'ready' {
  const hydrated = useRecords((s) => s.hydrated);
  const loadError = useRecords((s) => s.loadError);
  const mother = useRecords((s) => s.mother);
  const preview = useUi((s) => s.preview);
  if (preview !== 'live') return preview === 'empty' ? 'empty' : preview;
  if (!hydrated) return 'loading';
  if (loadError) return 'error';
  return mother ? 'ready' : 'empty';
}

export const appointmentDateTime = (a: { date: string; time: string }) => {
  const d = parseDate(a.date);
  const [h, m] = a.time.split(':').map(Number);
  d.setHours(h || 0, m || 0);
  return d;
};
