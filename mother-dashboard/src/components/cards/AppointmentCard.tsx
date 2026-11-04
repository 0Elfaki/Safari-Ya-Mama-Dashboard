import clsx from 'clsx';
import { Baby, CalendarDays, ChevronRight, Clock, MapPin, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Appointment } from '@/types';
import { fmtDate, relativeDays } from '@/utils/dates';
import { appointmentStatus, DemoBadge, StatusBadge } from '../common/StatusBadge';

export const appointmentTypeLabel: Record<Appointment['type'], string> = {
  antenatal: 'Antenatal care',
  postnatal: 'Postnatal care',
  'child-health': 'Child health',
  vaccination: 'Vaccination',
  other: 'Other',
};

/** Date tile + type, title, time, facility and status. Links to the details dialog. */
export function AppointmentCard({ a, compact }: { a: Appointment; compact?: boolean }) {
  const st = appointmentStatus[a.status];
  const d = new Date(`${a.date}T00:00`);
  return (
    <Link
      to={`/appointments/${a.id}`}
      className={clsx('group flex min-w-0 items-start gap-4 rounded-lg border border-line bg-surface transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary', compact ? 'p-4' : 'p-4 sm:p-5')}
      aria-label={`${a.title}, ${fmtDate(a.date)} at ${a.time}, ${a.facility}, ${st.label}. View details`}
    >
      <div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-primary-soft py-2 text-primary" aria-hidden>
        <span className="text-caption font-bold uppercase">{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
        <span className="t-num font-display text-h2 font-extrabold leading-none">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="t-label flex items-center gap-1">
          {a.forWhom === 'baby' ? <Baby className="h-4 w-4" aria-hidden /> : <UserRound className="h-4 w-4" aria-hidden />}
          {appointmentTypeLabel[a.type]}
        </p>
        <p className={clsx('mt-1 font-semibold text-ink', !compact && 'truncate')}>{a.title}</p>
        <div className="t-small mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden /> {relativeDays(a.date)} · {a.time}
          </span>
          {!compact && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden /> <span className="truncate">{a.facility}</span>
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge tone={st.tone} icon={st.icon}>
            {st.label}
          </StatusBadge>
          {a.source === 'demo' && <DemoBadge />}
        </div>
      </div>
      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-ink-2 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export function AppointmentsEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <CalendarDays className="h-6 w-6 text-ink-2" aria-hidden />
      <p className="font-semibold">No upcoming appointments</p>
      <p className="t-small">Add the date your clinic gave you so you get a reminder.</p>
    </div>
  );
}
