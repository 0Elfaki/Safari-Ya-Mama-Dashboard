import clsx from 'clsx';
import { CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Hospital, Phone, Video, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/Shell';
import { Chips, useToast } from '@/components/ui/Bits';
import { Button, ButtonLink } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { FormField, TextArea, TextInput } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateViews';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { addSlots, bookings, cancelBooking, cancelSlot, joinCall, setBookingStatus, slots, type Booking, type Slot } from '@/lib/care';
import { isoDay } from '@/lib/format';
import { msg, useT } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { useAsync } from '@/lib/useAsync';

const DAY = 864e5;
const startOfWeek = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const time = (s: string) => new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const dayName = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
const STATUS = { booked: ['primary', msg('Booked')], done: ['success', msg('Done')], missed: ['warning', msg('Missed')], cancelled: ['neutral', msg('Cancelled')] } as const;

function OpenTimes({ open, onClose, facility, onDone }: { open: boolean; onClose: () => void; facility: string; onDone: () => void }) {
  const toast = useToast();
  const t = useT();
  const [f, setF] = useState({ mode: 'clinic' as 'clinic' | 'video', date: isoDay(new Date(Date.now() + DAY)), start: '09:00', count: '8', minutes: '20' });
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const first = new Date(`${f.date}T${f.start}`);
  const n = Math.min(48, Math.max(1, Number(f.count) || 1)), m = Math.min(120, Math.max(5, Number(f.minutes) || 20));
  const last = new Date(first.getTime() + (n - 1) * m * 6e4);
  return (
    <Modal open={open} onClose={onClose} title={t('Open appointment times')} description={t('Back-to-back times mothers can book in the app. Times that already exist are kept.')}
      footer={<><Button variant="outline" onClick={onClose}>{t('Cancel')}</Button><Button icon={CalendarPlus} loading={busy} disabled={first.getTime() < Date.now()} onClick={async () => {
        setBusy(true); setErr(null);
        try { const made = await addSlots({ facility, mode: f.mode, first: first.toISOString(), count: n, minutes: m }); toast(t('{n} times opened', { n: made })); onDone(); onClose(); }
        catch (e) { setErr((e as Error).message); }
        setBusy(false);
      }}>{t('Open {n} times', { n })}</Button></>}>
      <div className="grid gap-4">
        <Chips label={t('Kind')} value={f.mode} onChange={(v) => setF({ ...f, mode: v })} options={[{ value: 'clinic', label: t('Clinic visit') }, { value: 'video', label: t('Video call') }]} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('Day')}><TextInput type="date" value={f.date} min={isoDay()} onChange={(e) => setF({ ...f, date: e.target.value })} /></FormField>
          <FormField label={t('First time')}><TextInput type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></FormField>
          <FormField label={t('How many times')} hint={t('1 to 48')}><TextInput inputMode="numeric" value={f.count} onChange={(e) => setF({ ...f, count: e.target.value.replace(/\D/g, '') })} /></FormField>
          <FormField label={t('Minutes each')} hint={t('Usually 20')}><TextInput inputMode="numeric" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value.replace(/\D/g, '') })} /></FormField>
        </div>
        <p className="t-small">{Number.isNaN(first.getTime()) ? t('Choose a day and time.') : t('{n} times from {from} to {to}, {m} minutes each.', { n, from: time(first.toISOString()), to: time(last.toISOString()), m })}{first.getTime() < Date.now() ? ` ${t('Choose a time in the future.')}` : ''}</p>
        {err && <p role="alert" className="text-small font-semibold text-danger">{err}</p>}
      </div>
    </Modal>
  );
}

function Outcome({ booking, onClose, onDone }: { booking: Booking | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const t = useT();
  const [note, setNote] = useState(''), [busy, setBusy] = useState<string | null>(null);
  if (!booking) return null;
  const go = async (s: 'done' | 'missed') => {
    setBusy(s);
    try { await setBookingStatus(booking.id, s, note.trim() || null); toast(s === 'done' ? t('Marked done') : t('Marked missed')); onDone(); onClose(); } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };
  return (
    <Modal open onClose={onClose} title={`${booking.mother_name} · ${time(booking.starts_at)}`} description={t('Record what happened. Advice you write here is shown to her in the app under this appointment.')}
      footer={<><Button variant="outline" icon={XCircle} loading={busy === 'missed'} onClick={() => go('missed')}>{t('She did not come')}</Button><Button icon={CheckCircle2} loading={busy === 'done'} onClick={() => go('done')}>{t('Done')}</Button></>}>
      <FormField label={t('Advice for her (optional)')} hint={t('{n}/1000. Plain words; no diagnosis she cannot act on.', { n: note.length })}><TextArea rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></FormField>
    </Modal>
  );
}

export default function AppointmentsPage() {
  const { facility } = useSession();
  const toast = useToast();
  const t = useT();
  const fid = facility!.id;
  const [week, setWeek] = useState(() => startOfWeek(new Date()));
  const [mode, setMode] = useState<'all' | 'clinic' | 'video'>('all');
  const [opening, setOpening] = useState(false);
  const [outcome, setOutcome] = useState<Booking | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const from = week.toISOString(), to = new Date(week.getTime() + 7 * DAY).toISOString();
  const { data, loading, error, reload } = useAsync(async () => ({ s: await slots(fid, from, to), b: await bookings(fid, from, to) }), [fid, from]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(week.getTime() + i * DAY)), [week]);
  const run = async (k: string, fn: () => Promise<unknown>, ok: string) => { setBusy(k); try { await fn(); toast(ok); reload(true); } catch (e) { toast((e as Error).message, 'bad'); } setBusy(null); };
  const join = async (b: Booking) => {
    setBusy(`j${b.id}`);
    const w = window.open('about:blank', '_blank');
    try {
      const r = await joinCall(b.id);
      if (r.url) { if (w) w.location.href = r.url; else window.location.assign(r.url); }
      else { w?.close(); toast(r.error === 'too_early' ? t('Too early: the call opens at {time}, 15 minutes before the start.', { time: time(r.opens_at!) }) : r.error === 'ended' ? t('This call has ended.') : r.error!, 'bad'); }
    } catch (e) { w?.close(); toast((e as Error).message, 'bad'); }
    setBusy(null);
  };

  const now = Date.now();
  const items = (d: Date) => {
    const k = isoDay(d);
    const bs = (data?.b ?? []).filter((b) => isoDay(new Date(b.starts_at)) === k && (mode === 'all' || b.mode === mode));
    const free = (data?.s ?? []).filter((s) => s.status === 'open' && isoDay(new Date(s.starts_at)) === k && (mode === 'all' || s.mode === mode));
    return [...bs.map((b) => ({ at: b.starts_at, b })), ...free.map((s) => ({ at: s.starts_at, s }))].sort((x, y) => (x.at < y.at ? -1 : 1)) as ({ at: string; b: Booking } | { at: string; s: Slot })[];
  };
  const weekBookings = (data?.b ?? []).filter((b) => b.status === 'booked').length;
  const weekFree = (data?.s ?? []).filter((s) => s.status === 'open').length;

  return (
    <>
      <PageHeader title={t('Appointments')} subtitle={t('Clinic visits and video calls mothers book in the app at {name}.', { name: facility!.name })} actions={<Button icon={CalendarPlus} onClick={() => setOpening(true)}>{t('Open times')}</Button>} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" icon={ChevronLeft} aria-label={t('Previous week')} onClick={() => setWeek(new Date(week.getTime() - 7 * DAY))}>{t('Previous')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setWeek(startOfWeek(new Date()))}>{t('This week')}</Button>
          <Button size="sm" variant="outline" iconRight={ChevronRight} aria-label={t('Next week')} onClick={() => setWeek(new Date(week.getTime() + 7 * DAY))}>{t('Next')}</Button>
          <span className="t-small ml-2">{days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <Chips label={t('Show')} value={mode} onChange={setMode} options={[{ value: 'all', label: t('All') }, { value: 'clinic', label: t('Clinic') }, { value: 'video', label: t('Video') }]} />
      </div>
      {loading ? <LoadingState text={t('Loading appointments…')} /> : error ? <ErrorState text={error} onRetry={() => reload()} /> : (
        <>
          <p className="t-small mb-4">{t('{booked} booked · {free} free times this week', { booked: weekBookings, free: weekFree })}</p>
          <div className="grid gap-4">
            {days.map((d) => {
              const list = items(d);
              const today = isoDay(d) === isoDay();
              return (
                <BaseCard key={d.toISOString()} className={clsx(today && 'border-primary')}>
                  <CardHeader title={`${dayName(d)}${today ? ` · ${t('today')}` : ''}`} subtitle={list.length ? undefined : t('Nothing booked or open')} />
                  {list.length > 0 && (
                    <ul className="divide-y divide-line">
                      {list.map((x) => 'b' in x ? (
                        <li key={x.b.id} className="flex flex-wrap items-center gap-3 py-3">
                          <span className="t-num w-14 shrink-0 font-semibold text-ink">{time(x.b.starts_at)}</span>
                          {x.b.mode === 'video' ? <Video className="h-5 w-5 shrink-0 text-primary" aria-label={t('Video call')} /> : <Hospital className="h-5 w-5 shrink-0 text-primary" aria-label={t('Clinic visit')} />}
                          <span className="min-w-0 flex-1">
                            <Link to={`/patients/${x.b.mother_id}`} className="inline-block min-h-6 font-semibold text-primary underline-offset-2 hover:underline">{x.b.mother_name}</Link>
                            <span className="t-small block">{t('{n} min', { n: x.b.minutes })}{x.b.reason ? ` · ${x.b.reason}` : ''}{x.b.outcome_note ? ` · ${t('advice: {note}', { note: x.b.outcome_note })}` : ''}</span>
                          </span>
                          <StatusBadge tone={STATUS[x.b.status][0]}>{t(STATUS[x.b.status][1])}</StatusBadge>
                          {x.b.status === 'booked' && (
                            <span className="flex flex-wrap gap-1">
                              {x.b.mode === 'video' && <Button size="sm" icon={Video} loading={busy === `j${x.b.id}`} onClick={() => join(x.b)}>{t('Join call')}</Button>}
                              {x.b.mother_phone && <ButtonLink size="sm" variant="ghost" icon={Phone} to={`tel:${x.b.mother_phone}`}>{t('Call')}</ButtonLink>}
                              {new Date(x.b.starts_at).getTime() < now + 30 * 6e4 && <Button size="sm" variant="outline" onClick={() => setOutcome(x.b)}>{t('Done / missed')}</Button>}
                              <Button size="sm" variant="ghost" loading={busy === `c${x.b.id}`} onClick={() => { if (confirm(t("Cancel {name}'s appointment? She sees it cancelled in the app.", { name: x.b.mother_name }))) run(`c${x.b.id}`, () => cancelBooking(x.b.id), t('Appointment cancelled')); }}>{t('Cancel')}</Button>
                            </span>
                          )}
                        </li>
                      ) : (
                        <li key={x.s.id} className="flex flex-wrap items-center gap-3 py-2">
                          <span className="t-num w-14 shrink-0 text-ink-2">{time(x.s.starts_at)}</span>
                          {x.s.mode === 'video' ? <Video className="h-5 w-5 shrink-0 text-ink-2" aria-label={t('Video call')} /> : <Hospital className="h-5 w-5 shrink-0 text-ink-2" aria-label={t('Clinic visit')} />}
                          <span className="t-small min-w-0 flex-1">{t('Free · {n} min', { n: x.s.minutes })}</span>
                          <Button size="sm" variant="ghost" loading={busy === `s${x.s.id}`} onClick={() => run(`s${x.s.id}`, () => cancelSlot(x.s.id), t('Time closed'))}>{t('Close this time')}</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </BaseCard>
              );
            })}
          </div>
          {!data?.b.length && !data?.s.length && <EmptyState className="mt-4" icon={CalendarPlus} title={t('No times open this week')} text={t('Open times so mothers can book a clinic visit or a video call in the app.')} action={<Button icon={CalendarPlus} onClick={() => setOpening(true)}>{t('Open times')}</Button>} />}
        </>
      )}
      <OpenTimes open={opening} onClose={() => setOpening(false)} facility={fid} onDone={() => reload(true)} />
      <Outcome booking={outcome} onClose={() => setOutcome(null)} onDone={() => reload(true)} />
    </>
  );
}
