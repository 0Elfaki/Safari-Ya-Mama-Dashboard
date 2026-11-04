import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { Accessibility, Baby, Languages, Lock, Trash2, UserRound, HeartPulse } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/common/Button';
import { BaseCard, CardHeader } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { DemoBadge } from '@/components/common/StatusBadge';
import { FormField, TextInput, Toggle } from '@/components/forms/FormField';
import { Avatar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCare } from '@/hooks/useCare';
import { usePrefs } from '@/store/prefs';
import { useRecords } from '@/store/records';
import type { Lang, MotherProfile } from '@/types';
import { addDays, isoDate } from '@/utils/dates';

const today = () => isoDate();
const within = (iso: string, minDays: number, maxDays: number) => iso >= isoDate(addDays(new Date(), minDays)) && iso <= isoDate(addDays(new Date(), maxDays));

function Saved({ show }: { show: boolean }) {
  return (
    <p role="status" className={clsx('text-small font-semibold text-success', !show && 'invisible')}>
      Saved
    </p>
  );
}
function useSavedFlag() {
  const [saved, setSaved] = useState(false);
  return { saved, flash: () => (setSaved(true), window.setTimeout(() => setSaved(false), 2500)) };
}
function FormActions({ saved, children }: { saved: boolean; children?: ReactNode }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
      <Saved show={saved} />
      {children}
      <Button type="submit">Save</Button>
    </div>
  );
}

function useSaveMother() {
  const mother = useRecords((s) => s.mother);
  const saveMother = useRecords((s) => s.saveMother);
  return (patch: Partial<MotherProfile>) =>
    saveMother({
      name: mother?.name ?? '',
      phone: mother?.phone,
      lmp: mother?.lmp,
      edd: mother?.edd,
      deliveryDate: mother?.deliveryDate,
      prescribedSupplements: mother?.prescribedSupplements ?? [],
      ...patch,
    });
}

const personalSchema = z.object({
  name: z.string().trim().min(1, 'Enter the name you like to be called').max(60),
  phone: z.union([z.literal(''), z.string().trim().regex(/^\+?[0-9 ()-]{6,20}$/, 'Enter a phone number using digits')]),
});

function PersonalForm() {
  const mother = useRecords((s) => s.mother);
  const save = useSaveMother();
  const { saved, flash } = useSavedFlag();
  const { register, handleSubmit, formState } = useForm<z.infer<typeof personalSchema>>({ resolver: zodResolver(personalSchema), values: { name: mother?.name ?? '', phone: mother?.phone ?? '' } });
  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) => {
        save({ name: v.name, phone: v.phone || undefined });
        flash();
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" required error={formState.errors.name?.message}>
          <TextInput autoComplete="given-name" {...register('name')} />
        </FormField>
        <FormField label="Phone number" error={formState.errors.phone?.message}>
          <TextInput type="tel" inputMode="tel" autoComplete="tel" {...register('phone')} />
        </FormField>
      </div>
      <FormActions saved={saved} />
    </form>
  );
}

const maternalSchema = z
  .object({
    dating: z.enum(['edd', 'lmp']),
    date: z.string(),
    deliveryDate: z.string(),
    ifa: z.boolean(),
    otherSupplements: z.string().max(120),
  })
  .superRefine((v, ctx) => {
    if (v.deliveryDate) {
      if (v.deliveryDate > today()) ctx.addIssue({ code: 'custom', path: ['deliveryDate'], message: 'The birth date cannot be in the future' });
      return;
    }
    if (!v.date) return ctx.addIssue({ code: 'custom', path: ['date'], message: v.dating === 'edd' ? 'Enter your due date' : 'Enter the first day of your last period' });
    if (v.dating === 'lmp' && !within(v.date, -300, 0)) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Enter a date in the last 10 months' });
    if (v.dating === 'edd' && !within(v.date, -14, 300)) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Enter a due date within the next 10 months' });
  });
type MaternalValues = z.infer<typeof maternalSchema>;

function MaternalForm() {
  const mother = useRecords((s) => s.mother);
  const save = useSaveMother();
  const { saved, flash } = useSavedFlag();
  const supp = mother?.prescribedSupplements ?? [];
  const { register, handleSubmit, watch, formState } = useForm<MaternalValues>({
    resolver: zodResolver(maternalSchema),
    values: {
      dating: mother?.lmp && !mother.edd ? 'lmp' : 'edd',
      date: mother?.edd ?? mother?.lmp ?? '',
      deliveryDate: mother?.deliveryDate ?? '',
      ifa: supp.includes('Iron and folic acid'),
      otherSupplements: supp.filter((s) => s !== 'Iron and folic acid').join(', '),
    },
  });
  const dating = watch('dating');
  const e = formState.errors;
  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) => {
        const other = v.otherSupplements.split(',').map((s) => s.trim()).filter(Boolean);
        save({
          edd: v.dating === 'edd' && v.date ? v.date : undefined,
          lmp: v.dating === 'lmp' && v.date ? v.date : undefined,
          deliveryDate: v.deliveryDate || undefined,
          prescribedSupplements: [...(v.ifa ? ['Iron and folic acid'] : []), ...other],
        });
        flash();
      })}
    >
      <fieldset>
        <legend className="mb-2 text-small font-semibold text-ink">How is your pregnancy dated?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['edd', 'Due date from my clinic'],
              ['lmp', 'First day of my last period'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className={clsx('flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3', dating === k ? 'border-primary bg-primary-soft' : 'border-line')}>
              <input type="radio" value={k} className="h-5 w-5 accent-primary" {...register('dating')} />
              <span className="text-small font-medium text-ink">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <FormField label={dating === 'edd' ? 'Due date' : 'First day of last period'} error={e.date?.message} hint="Your clinic's dating always takes priority.">
          <TextInput type="date" {...register('date')} />
        </FormField>
        <FormField label="Date your baby was born" error={e.deliveryDate?.message} hint="Leave empty while you are pregnant.">
          <TextInput type="date" max={today()} {...register('deliveryDate')} />
        </FormField>
      </div>
      <fieldset className="mt-5">
        <legend className="mb-2 text-small font-semibold text-ink">Supplements your clinic prescribed</legend>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-line px-3">
          <input type="checkbox" className="h-5 w-5 accent-primary" {...register('ifa')} />
          <span className="text-small font-medium text-ink">Iron and folic acid</span>
        </label>
        <FormField label="Other prescribed supplements" hint="Separate with commas. Only add what your clinic prescribed." className="mt-4" error={e.otherSupplements?.message}>
          <TextInput {...register('otherSupplements')} />
        </FormField>
      </fieldset>
      <FormActions saved={saved} />
    </form>
  );
}

const babySchema = z.object({
  name: z.string().trim().min(1, "Enter your baby's name").max(40),
  birthDate: z.string().min(1, 'Enter the birth date').refine((d) => within(d, -730, 0), 'Enter a birth date in the last 2 years'),
  birthWeightKg: z.union([z.literal(''), z.coerce.number().min(0.5, 'Check the weight (kg)').max(6.5, 'Check the weight (kg)')]),
  birthFacility: z.string().trim().max(80),
});

function BabyForm() {
  const baby = useRecords((s) => s.baby);
  const mother = useRecords((s) => s.mother);
  const saveBaby = useRecords((s) => s.saveBaby);
  const removeBaby = useRecords((s) => s.removeBaby);
  const { saved, flash } = useSavedFlag();
  const { register, handleSubmit, formState } = useForm<z.input<typeof babySchema>>({
    resolver: zodResolver(babySchema),
    values: { name: baby?.name ?? '', birthDate: baby?.birthDate ?? mother?.deliveryDate ?? '', birthWeightKg: baby?.birthWeightKg ?? '', birthFacility: baby?.birthFacility ?? '' },
  });
  if (!mother) return <p className="t-small">Save your personal information first.</p>;
  const e = formState.errors;
  return (
    <form
      noValidate
      onSubmit={handleSubmit((raw) => {
        const v = babySchema.parse(raw);
        saveBaby({ name: v.name, birthDate: v.birthDate, birthWeightKg: v.birthWeightKg === '' ? undefined : v.birthWeightKg, birthFacility: v.birthFacility || undefined });
        flash();
      })}
    >
      <p className="t-small mb-4">Your baby has their own record, linked to yours.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Baby's name" required error={e.name?.message}>
          <TextInput {...register('name')} />
        </FormField>
        <FormField label="Birth date" required error={e.birthDate?.message}>
          <TextInput type="date" max={today()} {...register('birthDate')} />
        </FormField>
        <FormField label="Birth weight (kg)" error={e.birthWeightKg?.message} hint="From the child health card.">
          <TextInput inputMode="decimal" {...register('birthWeightKg')} />
        </FormField>
        <FormField label="Place of birth" error={e.birthFacility?.message}>
          <TextInput {...register('birthFacility')} />
        </FormField>
      </div>
      <FormActions saved={saved}>
        {baby && (
          <Button variant="ghost" icon={Trash2} className="text-danger" onClick={removeBaby}>
            Remove baby profile
          </Button>
        )}
      </FormActions>
    </form>
  );
}

function Section({ id, icon, title, subtitle, children }: { id: string; icon: typeof UserRound; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <BaseCard id={id} tabIndex={-1} className="scroll-mt-24 outline-none" aria-labelledby={`${id}-title`}>
      <CardHeader id={`${id}-title`} icon={icon} title={title} subtitle={subtitle} />
      {children}
    </BaseCard>
  );
}

export function ProfilePage() {
  const { mother, isDemo, firstName } = useCare();
  const prefs = usePrefs();
  const clearAll = useRecords((s) => s.clearAll);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageHeader title="My Profile" subtitle="Your details, your baby's details and your preferences." eyebrow={isDemo ? <DemoBadge /> : undefined} />
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={mother?.name ?? ''} size="lg" />
        <div className="min-w-0">
          <p className="t-h3 truncate">{firstName || 'Welcome, Mama'}</p>
          <p className="t-small">{mother ? 'Profile saved on this device' : 'Start by adding your name'}</p>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <Section id="personal" icon={UserRound} title="Personal information">
            <PersonalForm />
          </Section>
          {mother && (
            <Section id="maternal" icon={HeartPulse} title="Maternal profile" subtitle="Used to follow your pregnancy and your care stage.">
              <MaternalForm />
            </Section>
          )}
          <Section id="baby" icon={Baby} title="Baby profile">
            <BabyForm />
          </Section>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Section id="language" icon={Languages} title="Language" subtitle="Language for health lessons, danger signs and MamaBot answers.">
            <div role="radiogroup" aria-label="Content language" className="grid grid-cols-2 gap-2">
              {(
                [
                  ['en', 'English'],
                  ['sw', 'Kiswahili'],
                ] as [Lang, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={prefs.contentLang === k}
                  onClick={() => prefs.set({ contentLang: k })}
                  className={clsx('min-h-12 rounded-md border px-4 font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary', prefs.contentLang === k ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink hover:border-primary/40')}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="t-caption mt-3">Menus and buttons stay in English in this version.</p>
          </Section>
          <Section id="accessibility" icon={Accessibility} title="Accessibility">
            <div className="divide-y divide-line">
              <Toggle label="Larger text" description="Makes all text about 12% bigger." checked={prefs.textSize === 'large'} onChange={(v) => prefs.set({ textSize: v ? 'large' : 'default' })} />
              <Toggle label="Reduce motion" description="Turns off animations, even if your device allows them." checked={prefs.reduceMotion} onChange={(v) => prefs.set({ reduceMotion: v })} />
            </div>
          </Section>
          <Section id="privacy" icon={Lock} title="Privacy and consent">
            <div className="divide-y divide-line">
              <Toggle
                label="Share my records with my health worker"
                description="This preview is not connected to a clinic, so nothing is shared even when this is on. Your choice is saved for when it is connected."
                checked={prefs.consent.shareWithHealthWorker}
                onChange={(v) => prefs.set({ consent: { ...prefs.consent, shareWithHealthWorker: v } })}
              />
              <Toggle
                label="Help improve Safari ya Mama"
                description="Allow anonymous usage counts. No usage data is collected in this preview."
                checked={prefs.consent.usageStats}
                onChange={(v) => prefs.set({ consent: { ...prefs.consent, usageStats: v } })}
              />
            </div>
            <div className="mt-4 rounded-md bg-surface-2 p-4">
              <p className="font-semibold text-ink">Your data</p>
              <p className="t-small mt-1">Everything you enter is stored in this browser only. Delete it at any time.</p>
              <Button variant="outline" size="sm" icon={Trash2} className="mt-3 text-danger" onClick={() => setConfirm(true)}>
                Delete all my records
              </Button>
            </div>
          </Section>
        </div>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete all records?"
        description="Your profile, baby profile, appointments, diary, feeds and emergency plan will be removed from this device."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Keep my records
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => {
                clearAll();
                setConfirm(false);
              }}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <p className="t-small text-ink">You cannot undo this.</p>
      </Modal>
    </>
  );
}
