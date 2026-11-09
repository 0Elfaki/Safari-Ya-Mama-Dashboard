import { CalendarDays, Hospital, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { bookings } from '@/lib/care';
import { useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';

/** Today's clinic visits and video calls (Join call is on the Appointments page). */
export function TodayAppointments({ facility }: { facility: string }) {
  const t = useT();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 864e5);
  const { data, loading } = useAsync(() => bookings(facility, start.toISOString(), end.toISOString()).catch(() => []), [facility]);
  const list = (data ?? []).filter((b) => b.status !== 'cancelled');
  return (
    <BaseCard className="mt-6" aria-labelledby="t-appts">
      <CardHeader id="t-appts" icon={CalendarDays} title={t("Today's appointments")} subtitle={t('Booked by mothers in the app.')} action={<ButtonLink size="sm" variant="outline" to="/appointments">{t('Open the calendar')}</ButtonLink>} />
      {loading ? <LoadingState text={t('Loading…')} /> : list.length === 0 ? <EmptyState compact icon={CalendarDays} title={t('No appointments today')} /> : (
        <ul className="flex flex-col divide-y divide-line">
          {list.map((b) => (
            <li key={b.id}>
              <Link to={b.mode === 'video' ? '/appointments' : `/patients/${b.mother_id}`} className="flex min-h-14 items-center gap-3 py-2 hover:bg-surface-2">
                <span className="t-num w-14 shrink-0 font-semibold text-ink">{new Date(b.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                {b.mode === 'video' ? <Video className="h-5 w-5 shrink-0 text-primary" aria-label={t('Video call')} /> : <Hospital className="h-5 w-5 shrink-0 text-primary" aria-label={t('Clinic visit')} />}
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink">{b.mother_name}</span><span className="t-small block truncate">{b.reason ?? (b.mode === 'video' ? t('Video call') : t('Clinic visit'))}</span></span>
                <StatusBadge tone={b.status === 'done' ? 'success' : b.status === 'missed' ? 'warning' : 'primary'}>{b.status === 'booked' ? (b.mode === 'video' ? t('Join from the calendar') : t('Booked')) : b.status === 'done' ? t('Done') : t('Missed')}</StatusBadge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BaseCard>
  );
}
