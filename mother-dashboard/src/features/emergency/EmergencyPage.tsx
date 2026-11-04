import { zodResolver } from '@hookform/resolvers/zod';
import { Bus, Building2, MapPin, Phone, Plus, Siren, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DangerSignList } from '@/components/cards/DangerSignList';
import { NEAREST_FACILITY_URL } from '@/components/cards/EmergencyCard';
import { Button, ButtonLink, IconButton } from '@/components/common/Button';
import { BaseCard, CardHeader } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/StateViews';
import { DemoBadge } from '@/components/common/StatusBadge';
import { FormField, TextInput } from '@/components/forms/FormField';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { content, lessonById, tr } from '@/data/content';
import { useCare } from '@/hooks/useCare';
import { usePrefs } from '@/store/prefs';
import { useRecords } from '@/store/records';

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{6,20}$/, 'Enter a phone number using digits');
const contactSchema = z.object({ name: z.string().trim().min(2, 'Enter a name').max(60), relation: z.string().trim().max(40).optional(), phone });
type ContactForm = z.infer<typeof contactSchema>;

const planSchema = z.object({
  facilityName: z.string().trim().max(80),
  facilityPhone: z.union([z.literal(''), phone]),
  facilityAddress: z.string().trim().max(120),
  method: z.string().trim().max(80),
  contactName: z.string().trim().max(60),
  contactPhone: z.union([z.literal(''), phone]),
  moneySaved: z.boolean(),
});
type PlanForm = z.infer<typeof planSchema>;

const tel = (p: string) => `tel:${p.replace(/[^+0-9]/g, '')}`;

function Contacts() {
  const plan = useRecords((s) => s.plan);
  const addContact = useRecords((s) => s.addContact);
  const removeContact = useRecords((s) => s.removeContact);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState } = useForm<ContactForm>({ resolver: zodResolver(contactSchema), defaultValues: { name: '', relation: '', phone: '' } });
  const contacts = plan?.contacts ?? [];
  const submit = handleSubmit((v) => {
    addContact({ name: v.name, relation: v.relation ?? '', phone: v.phone });
    reset();
    setOpen(false);
  });
  return (
    <BaseCard aria-labelledby="contacts-title">
      <CardHeader
        id="contacts-title"
        icon={UserRound}
        title="Emergency contacts"
        subtitle="People who will help you get to care."
        headingLevel={3}
        action={
          <Button variant="secondary" size="sm" icon={Plus} onClick={() => setOpen(true)}>
            Add
          </Button>
        }
      />
      {contacts.length === 0 ? (
        <EmptyState compact icon={UserRound} title="No contacts yet" text="Add someone who can take you to a facility at any time." />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{c.name}</p>
                <p className="t-small truncate">
                  {c.relation ? `${c.relation} · ` : ''}
                  <span className="t-num">{c.phone}</span>
                </p>
              </div>
              <ButtonLink to={tel(c.phone)} variant="secondary" size="sm" icon={Phone} aria-label={`Call ${c.name}`}>
                Call
              </ButtonLink>
              {plan?.source !== 'demo' && <IconButton icon={Trash2} label={`Remove ${c.name}`} onClick={() => removeContact(c.id)} />}
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add emergency contact"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Save contact</Button>
          </>
        }
      >
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <FormField label="Name" required error={formState.errors.name?.message}>
            <TextInput {...register('name')} autoComplete="name" />
          </FormField>
          <FormField label="Relationship" hint="For example: partner, sister, CHW">
            <TextInput {...register('relation')} />
          </FormField>
          <FormField label="Phone number" required error={formState.errors.phone?.message}>
            <TextInput type="tel" inputMode="tel" autoComplete="tel" {...register('phone')} />
          </FormField>
          <button type="submit" hidden />
        </form>
      </Modal>
    </BaseCard>
  );
}

function PlanDetails() {
  const plan = useRecords((s) => s.plan);
  const savePlan = useRecords((s) => s.savePlan);
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, formState } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    values: {
      facilityName: plan?.facility.name ?? '',
      facilityPhone: plan?.facility.phone ?? '',
      facilityAddress: plan?.facility.address ?? '',
      method: plan?.transport.method ?? '',
      contactName: plan?.transport.contactName ?? '',
      contactPhone: plan?.transport.contactPhone ?? '',
      moneySaved: plan?.transport.moneySaved ?? false,
    },
  });
  const e = formState.errors;
  const submit = handleSubmit((v) => {
    savePlan({
      facility: { name: v.facilityName, phone: v.facilityPhone || undefined, address: v.facilityAddress || undefined },
      transport: { method: v.method, contactName: v.contactName || undefined, contactPhone: v.contactPhone || undefined, moneySaved: v.moneySaved },
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  });
  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2" noValidate>
      <BaseCard aria-labelledby="facility-title">
        <CardHeader id="facility-title" icon={Building2} title="Preferred health facility" subtitle="Where you plan to go for care and for the birth." headingLevel={3} />
        <div className="grid gap-4">
          <FormField label="Facility name" error={e.facilityName?.message}>
            <TextInput {...register('facilityName')} />
          </FormField>
          <FormField label="Facility phone" error={e.facilityPhone?.message}>
            <TextInput type="tel" inputMode="tel" {...register('facilityPhone')} />
          </FormField>
          <FormField label="Address or directions" error={e.facilityAddress?.message}>
            <TextInput {...register('facilityAddress')} />
          </FormField>
          <div className="flex flex-wrap gap-3">
            {plan?.facility.phone && (
              <ButtonLink to={tel(plan.facility.phone)} variant="danger" size="sm" icon={Phone}>
                Call facility
              </ButtonLink>
            )}
            <ButtonLink to={NEAREST_FACILITY_URL} variant="outline" size="sm" icon={MapPin} aria-label="Find the nearest facility (opens maps in a new tab)">
              Find nearest facility
            </ButtonLink>
          </div>
        </div>
      </BaseCard>
      <BaseCard aria-labelledby="transport-title">
        <CardHeader id="transport-title" icon={Bus} title="Transport arrangements" subtitle="How you will get there, day or night." headingLevel={3} />
        <div className="grid gap-4">
          <FormField label="How you will travel" hint="For example: bajaji, motorbike, neighbour's car">
            <TextInput {...register('method')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Driver or helper" error={e.contactName?.message}>
              <TextInput {...register('contactName')} />
            </FormField>
            <FormField label="Their phone" error={e.contactPhone?.message}>
              <TextInput type="tel" inputMode="tel" {...register('contactPhone')} />
            </FormField>
          </div>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-line px-3">
            <input type="checkbox" className="h-5 w-5 accent-primary" {...register('moneySaved')} />
            <span className="text-small font-medium text-ink">Money for transport is saved</span>
          </label>
        </div>
      </BaseCard>
      <div className="flex items-center justify-end gap-3 lg:col-span-2">
        {saved && (
          <p role="status" className="text-small font-semibold text-success">
            Plan saved
          </p>
        )}
        <Button type="submit">Save plan</Button>
      </div>
    </form>
  );
}

export function EmergencyPage() {
  const { stage, isDemo } = useCare();
  const lang = usePrefs((s) => s.contentLang);
  const plan = useRecords((s) => s.plan);
  const steps = lessonById(stage === 'postpartum' ? 'danger-baby' : 'danger-preg')?.steps[lang] ?? [];
  return (
    <>
      <PageHeader title="Emergency Plan" subtitle="Who to call, where to go and how to get there." eyebrow={isDemo && plan?.source === 'demo' ? <DemoBadge /> : undefined} />

      <section aria-labelledby="now-title" className="overflow-hidden rounded-xl border-2 border-danger/40 bg-surface shadow-card">
        <div className="flex flex-col gap-4 bg-danger p-5 text-white sm:flex-row sm:items-center sm:p-6">
          <Siren className="h-10 w-10 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 id="now-title" className="font-display text-h2 font-extrabold text-white">
              Danger sign? Go to a health facility now.
            </h2>
            <p className="mt-1 text-body text-white">Do not wait to see if it gets better. Ask someone to go with you and take your clinic card.</p>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
          {plan?.facility.phone ? (
            <ButtonLink to={tel(plan.facility.phone)} variant="danger" icon={Phone} block>
              Call facility
            </ButtonLink>
          ) : (
            <ButtonLink to="#plan" variant="danger" icon={Building2} block>
              Add your facility
            </ButtonLink>
          )}
          {(plan?.contacts ?? []).slice(0, 2).map((c) => (
            <ButtonLink key={c.id} to={tel(c.phone)} variant="outline" icon={Phone} block className="text-danger" aria-label={`Call ${c.name}`}>
              Call {c.name}
            </ButtonLink>
          ))}
          <ButtonLink to={NEAREST_FACILITY_URL} variant="outline" icon={MapPin} block className="text-danger" aria-label="Nearest facility (opens maps in a new tab)">
            Nearest facility
          </ButtonLink>
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader id="danger-signs" title="Danger signs" subtitle={stage === 'postpartum' ? 'For you after birth, and for your baby.' : 'In pregnancy.'} />
        {stage === 'postpartum' ? (
          <div className="flex flex-col gap-8">
            <div>
              <h3 className="t-h3 mb-3">You</h3>
              <DangerSignList signs={content.postpartumSigns} who="mothers after birth" />
            </div>
            <div>
              <h3 className="t-h3 mb-3">Your baby</h3>
              <DangerSignList signs={content.babySigns} who="babies" />
            </div>
          </div>
        ) : (
          <DangerSignList signs={content.pregnancySigns} who="pregnancy" />
        )}
      </section>

      <div className="mt-10 grid gap-6 xl:grid-cols-3">
        <section className="min-w-0 xl:col-span-1">
          <SectionHeader id="contacts" title="Contacts" />
          <Contacts />
        </section>
        <section className="min-w-0 xl:col-span-2">
          <SectionHeader id="instructions" title="What to do" />
          <BaseCard>
            <ol className="flex flex-col gap-3">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-soft font-display text-small font-bold text-danger" aria-hidden>
                    {i + 1}
                  </span>
                  <p className="t-body min-w-0 text-ink">{s}</p>
                </li>
              ))}
            </ol>
            <p className="t-caption mt-4">From the lesson “{tr(lessonById(stage === 'postpartum' ? 'danger-baby' : 'danger-preg')?.title, lang)}”.</p>
          </BaseCard>
        </section>
      </div>

      <section className="mt-10">
        <SectionHeader id="plan" title="Facility and transport" subtitle="Saved on this device." />
        <PlanDetails />
      </section>
    </>
  );
}
