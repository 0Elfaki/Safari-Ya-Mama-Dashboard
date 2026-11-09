import { daysBetween, startOfToday, toDay, visitLabel, weeksSince, worst } from '@/lib/format';
import type { patients } from '@/lib/api';
import { tr } from '@/lib/i18n';
import type { Level } from '@/lib/types';

export interface PatientRow {
  id: string; name: string; phone: string | null; stage: 'pregnant' | 'baby' | 'none'; weeks: number | null; edd: string | null;
  babyName: string | null; babyDays: number | null;
  last: { level: Level; at: string; reasons: string[] } | null; daysSinceCheck: number | null;
  openRed: number; openAmber: number; next: { label: string; due: string; overdue: boolean } | null; overdueVisits: number;
}

/** One row per sharing mother, from the bulk patient query. Only facts she shared; no new judgement. */
export function buildRows(d: Awaited<ReturnType<typeof patients>>): PatientRow[] {
  const today = startOfToday();
  return d.mothers.map((m) => {
    const preg = d.pregnancies.find((p) => p.mother_id === m.id);
    const kids = d.babies.filter((b) => b.mother_id === m.id).sort((a, b) => (a.dob < b.dob ? 1 : -1));
    const lastBorn = kids[0];
    const twins = lastBorn ? kids.filter((k) => k.dob === lastBorn.dob) : [];
    const ck = d.checkins.find((c) => c.mother_id === m.id);
    const al = d.openAlerts.filter((a) => a.mother_id === m.id);
    const visits = d.appointments.filter((a) => a.mother_id === m.id);
    const overdue = visits.filter((a) => toDay(a.due_on) < today);
    const next = visits[0];
    return {
      id: m.id, name: m.display_name, phone: m.phone,
      stage: preg ? 'pregnant' : lastBorn ? 'baby' : 'none',
      weeks: preg ? weeksSince(preg.lmp) : null, edd: preg?.edd ?? null,
      babyName: twins.length ? twins.map((b) => b.name || tr('Baby')).join(' & ') : null,
      babyDays: lastBorn ? daysBetween(today, toDay(lastBorn.dob)) : null,
      last: ck ? { level: worst(ck.level, ck.server_level), at: ck.client_created_at, reasons: [...(ck.signs ?? []), ...(ck.baby_signs ?? [])] } : null,
      daysSinceCheck: ck ? daysBetween(today, toDay(ck.client_created_at.slice(0, 10))) : null,
      openRed: al.filter((a) => a.level === 'red').length, openAmber: al.filter((a) => a.level === 'amber').length,
      next: next ? { label: visitLabel(next.kind, next.contact_no), due: next.due_on, overdue: toDay(next.due_on) < today } : null,
      overdueVisits: overdue.length,
    };
  });
}
