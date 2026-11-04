import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { Bell, CalendarDays, CalendarPlus, CheckCircle2, Clock, MapPin, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { AppointmentCard, AppointmentsEmpty, appointmentTypeLabel } from '@/components/cards/AppointmentCard';
import { Button } from '@/components/common/Button';
import { BaseCard, CardHeader } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/StateViews';
import { appointmentStatus, DemoBadge, StatusBadge } from '@/components/common/StatusBadge';
import { FormField, Select, TextArea, TextInput, Toggle } from '@/components/forms/FormField';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { RecordsGate } from '@/components/layout/RecordsGate';
import { useCare } from '@/hooks/useCare';
import { usePrefs } from '@/store/prefs';
import { useRecords } from '@/store/records';
import type { Appointment, AppointmentType } from '@/types';
import { fmtDate, isoDate, relativeDays } from '@/utils/dates';

const types = Object.keys(appointmentTypeLabel) as AppointmentType[];

const schema = z.object({
  type: z.enum(types as [AppointmentType, ...AppointmentType[]]),
  title: z.string().trim().min(2, 'Give the appointment a name').max(80, 'Keep the name under 80 characters'),
  forWhom: z.enum(['mother', 'baby']),
  date: z.string().min(1, 'Choose a date'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time'),
  facility: z.string().trim().min(2, 'Enter the facility name').max(80),
  notes: z.string().max(300, 'Keep notes under 300 characters').optional(),
});
type FormValues = z.infer<typeof schema>;

function AddAppointment({ open, onClose }: { open: boolean; onClose: () => void }) {
  const add = useRecords((s) => s.addAppointment);
  const plan = useRecords((s) => s.plan);
  const { stage } = useCare();
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: stage === 'postpartum' ? 'postnatal' : 'antenatal', title: '', forWhom: 'mother', date: isoDate(), time: '09:00', facility: plan?.facility.name ?? '', notes: '' },
  });
  const e = formState.errors;
  const submit = handleSubmit((v) => {
    add({ ...v, notes: v.notes?.trim() || undefined, status: 'scheduled' });
    reset();
    onClose();
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add appointment"
      description="Use the date and time your clinic gave you."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={formState.isSubmitting}>
            Save appointment
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type" required error={e.type?.message}>
            <Select {...register('type')}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {appointmentTypeLabel[t]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="For" required error={e.forWhom?.message}>
            <Select {...register('forWhom')}>
              <option value="mother">Me</option>
              <option value="baby">My baby</option>
            </Select>
          </FormField>
        </div>
        <FormField label="Name" required error={e.title?.message} hint="For example: Fourth antenatal contact">
          <TextInput {...register('title')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Date" required error={e.date?.message}>
            <TextInput type="date" {...register('date')} />
          </FormField>
          <FormField label="Time" required error={e.time?.message}>
            <TextInput type="time" {...register('time')} />
          </FormField>
        </div>
        <FormField label="Facility" required error={e.facility?.message}>
          <TextInput {...register('facility')} autoComplete="off" />
        </FormField>
        <FormField label="Notes" error={e.notes?.message}>
          <TextArea {...register('notes')} />
        </FormField>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function Details({ a, onClose }: { a: Appointment | undefined; onClose: () => void }) {
  const update = useRecords((s) => s.updateAppointment);
  const remove = useRecords((s) => s.removeAppointment);
  if (!a) return null;
  const st = appointmentStatus[a.status];
  const open = a.status === 'scheduled' || a.status === 'confirmed';
  return (
    <Modal
      open
      onClose={onClose}
      title={a.title}
      description={appointmentTypeLabel[a.type]}
      footer={
        <>
          {a.source !== 'demo' && (
            <Button
              variant="ghost"
              icon={Trash2}
              className="mr-auto text-danger"
              onClick={() => {
                remove(a.id);
                onClose();
              }}
            >
              Delete
            </Button>
          )}
          {open ? (
            <>
              <Button variant="outline" icon={XCircle} onClick={() => update(a.id, { status: 'cancelled' })}>
                Mark cancelled
              </Button>
              <Button icon={CheckCircle2} onClick={() => update(a.id, { status: 'completed' })}>
                Mark attended
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => update(a.id, { status: 'scheduled' })}>
              Mark as scheduled
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={st.tone} icon={st.icon}>
          {st.label}
        </StatusBadge>
        {a.source === 'demo' && <DemoBadge />}
      </div>
      <dl className="mt-5 grid gap-4">
        {[
          [CalendarDays, 'Date', `${fmtDate(a.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (${relativeDays(a.date).toLowerCase()})`],
          [Clock, 'Time', a.time],
          [MapPin, 'Facility', a.facility],
        ].map(([Icon, k, v]) => {
          const I = Icon as typeof CalendarDays;
          return (
            <div key={k as string} className="flex items-start gap-3">
              <I className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <dt className="t-label">{k as string}</dt>
                <dd className="mt-1 font-semibold text-ink">{v as string}</dd>
              </div>
            </div>
          );
        })}
      </dl>
      {a.notes && <p className="t-small mt-5 rounded-md bg-surface-2 p-3 text-ink">{a.notes}</p>}
      <p className="t-caption mt-5">Bring your clinic card{a.forWhom === 'baby' ? " and your baby's child health card" : ''}.</p>
      {a.status === 'missed' && <p className="mt-3 text-small font-semibold text-warning">Contact your clinic to book a new date.</p>}
    </Modal>
  );
}

function ReminderSettings() {
  const reminders = usePrefs((s) => s.reminders);
  const set = usePrefs((s) => s.set);
  const r = (patch: Partial<typeof reminders>) => set({ reminders: { ...reminders, ...patch } });
  return (
    <BaseCard aria-labelledby="reminder-title">
      <CardHeader id="reminder-title" icon={Bell} title="Reminder settings" subtitle="Reminders show in the notifications bell while the dashboard is open." headingLevel={3} />
      <div className="divide-y divide-line">
        <Toggle label="Appointment reminders" description="Show upcoming appointments in notifications." checked={reminders.appointments} onChange={(v) => r({ appointments: v })} />
        <Toggle label="Remind me a week ahead" description="Otherwise only on the day." checked={reminders.dayBefore} onChange={(v) => r({ dayBefore: v })} />
        <Toggle label="Daily checklist reminder" description="Show what is left on today's care list." checked={reminders.checklist} onChange={(v) => r({ checklist: v })} />
      </div>
    </BaseCard>
  );
}

export function AppointmentsPage() {
  const { upcoming, past } = useCare();
  const appointments = useRecords((s) => s.appointments);
  const { id } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const adding = params.get('add') === '1';
  const setAdding = (v: boolean) => {
    const p = new URLSearchParams(params);
    if (v) p.set('add', '1');
    else p.delete('add');
    setParams(p, { replace: true });
  };
  const list = tab === 'upcoming' ? upcoming : past;
  const selected = id ? appointments.find((a) => a.id === id) : undefined;

  return (
    <RecordsGate title="Appointments">
      <PageHeader
        title="Appointments"
        subtitle="Your clinic visits and your baby's appointments."
        actions={
          <Button icon={CalendarPlus} onClick={() => setAdding(true)}>
            Add appointment
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="min-w-0 xl:col-span-2" aria-label="Appointment list">
          <div role="tablist" aria-label="Appointments" className="mb-4 inline-flex rounded-md border border-line bg-surface p-1">
            {(['upcoming', 'past'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={clsx('min-h-11 rounded-sm px-4 text-small font-semibold transition-colors', tab === t ? 'bg-primary text-white' : 'text-ink-2 hover:text-ink')}
              >
                {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <BaseCard>{tab === 'upcoming' ? <AppointmentsEmpty /> : <EmptyState compact icon={CalendarDays} title="No past appointments" />}</BaseCard>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((a) => (
                <li key={a.id}>
                  <AppointmentCard a={a} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="min-w-0">
          <SectionHeader id="reminders" title="Reminders" />
          <ReminderSettings />
        </section>
      </div>
      <AddAppointment open={adding} onClose={() => setAdding(false)} />
      <Details a={selected} onClose={() => nav('/appointments', { replace: true })} />
      {id && !selected && (
        <Modal open onClose={() => nav('/appointments', { replace: true })} title="Appointment not found">
          <p className="t-small text-ink">It may have been deleted.</p>
        </Modal>
      )}
    </RecordsGate>
  );
}
