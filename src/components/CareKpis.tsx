import { CalendarCheck, CalendarDays, CalendarX, Clock, MessagesSquare, ShieldAlert, Siren, Stethoscope, Users, Video } from 'lucide-react';
import { Kpi } from '@/components/ui/Bits';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { bookingKpis, communityKpis } from '@/lib/care';
import { fmtNum, fmtPct } from '@/lib/format';
import { tr, useT } from '@/lib/i18n';
import { useAsync } from '@/lib/useAsync';

const pct = (n: number | null | undefined) => (n == null ? tr('None yet') : fmtPct(n));
const mins = (n: number | null | undefined) => (n == null ? tr('None yet') : tr('{n} min', { n: Math.round(n) }));

/** Appointments and video calls (booking_kpis): one facility, or every facility (null). */
export function BookingKpis({ facility, from, to }: { facility: string | null; from: string; to: string }) {
  const { data: k, loading, error, reload } = useAsync(() => bookingKpis(facility, from, to), [facility, from, to]);
  const t = useT();
  if (loading) return <LoadingState text={t('Loading appointments…')} />;
  if (error || !k) return <ErrorState text={error ?? ''} onRetry={() => reload()} />;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Kpi label={t('Appointments booked')} icon={CalendarDays} value={fmtNum(k.booked)} sub={t('{opened} times opened · {pct} filled', { opened: fmtNum(k.slots_opened), pct: pct(k.fill_rate) })} />
      <Kpi label={t('Attended')} icon={CalendarCheck} value={pct(k.attendance_rate)} sub={t('{done} done · {missed} missed · {cancelled} cancelled', { done: fmtNum(k.done), missed: fmtNum(k.missed), cancelled: fmtNum(k.cancelled) })} tone={k.missed > k.done ? 'warning' : undefined} />
      <Kpi label={t('Video / clinic')} icon={Video} value={`${fmtNum(k.video)} / ${fmtNum(k.clinic)}`} sub={t('both joined {pct} of video calls', { pct: pct(k.video_both_joined_rate) })} />
      <Kpi label={t('Days from booking to visit')} icon={Clock} value={k.median_days_booking_to_visit == null ? t('None yet') : t('{n} d', { n: Math.round(k.median_days_booking_to_visit * 10) / 10 })} sub={t('median · {n} advice notes written', { n: fmtNum(k.advice_notes_written) })} />
    </div>
  );
}

/** Mothers' circle (community_kpis), whole platform. */
export function CommunityKpis({ from, to }: { from: string; to: string }) {
  const { data: k, loading, error, reload } = useAsync(() => communityKpis(from, to), [from, to]);
  const t = useT();
  if (loading) return <LoadingState text={t("Loading the Mothers' circle…")} />;
  if (error || !k) return <ErrorState text={error ?? ''} onRetry={() => reload()} />;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Kpi label={t('Posts and replies')} icon={MessagesSquare} value={`${fmtNum(k.posts)} / ${fmtNum(k.replies)}`} sub={t('{n} answers by health workers', { n: fmtNum(k.staff_answers) })} />
      <Kpi label={t('Members posting')} icon={Users} value={fmtNum(k.active_members)} hidden={k.active_members == null} sub={t('{pct} post anonymously', { pct: pct(k.anonymous_share) })} />
      <Kpi label={t('Waiting for review now')} icon={Stethoscope} value={fmtNum(k.waiting_now)} tone={k.waiting_now ? 'warning' : undefined} sub={t('{pct} of posts were held', { pct: pct(k.held_for_review_share) })} />
      <Kpi label={t('Median minutes to check')} icon={Clock} value={mins(k.median_minutes_to_check)} sub={t('urgent posts: {mins}', { mins: mins(k.median_minutes_urgent) })} />
      <Kpi label={t('Urgent posts')} icon={Siren} value={fmtNum(k.urgent_posts)} tone={k.urgent_posts ? 'danger' : undefined} sub={t('mentioned a danger sign')} />
      <Kpi label={t('Myths caught')} icon={ShieldAlert} value={fmtNum(k.myth_flags)} sub={t('{facts} checked facts shown · {ai} AI flags', { facts: fmtNum(k.fact_cards_shown), ai: fmtNum(k.ai_flags) })} />
      <Kpi label={t('Hidden or removed')} icon={CalendarX} value={`${fmtNum(k.hidden_by_reports)} / ${fmtNum(k.removed)}`} sub={t('hidden by reports / removed')} />
      <Kpi label={t('Members with strikes')} icon={ShieldAlert} value={fmtNum(k.members_with_strikes)} hidden={k.members_with_strikes == null} sub={k.muted_now == null ? t('fewer than 5 stopped from posting') : t('{n} stopped from posting now', { n: fmtNum(k.muted_now) })} />
    </div>
  );
}
