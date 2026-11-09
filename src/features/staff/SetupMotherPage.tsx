import { KeyRound, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/Shell';
import { Button } from '@/components/ui/Button';
import { BaseCard, CardHeader } from '@/components/ui/Card';
import { FormField, TextInput } from '@/components/ui/FormField';
import { setupMother } from '@/lib/care';
import { fmtDateTime } from '@/lib/format';
import { useT, useTn } from '@/lib/i18n';
import { useSession } from '@/lib/session';

/** For mothers without SMS or who need help: make her account and a one-time code she types in the app. */
export default function SetupMotherPage() {
  const { facility } = useSession();
  const t = useT(), tn = useTn();
  const [phone, setPhone] = useState(''), [name, setName] = useState('');
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState<{ code: string; expires_at: string; who: string } | null>(null);
  const okPhone = /^\+?[0-9 ]{9,16}$/.test(phone.trim());
  return (
    <>
      <PageHeader title={t("Set up a mother's account")} subtitle={t('Every mother signs in to the app with a code from her clinic. Make her code here and give it to her. Her home facility becomes {name}.', { name: facility!.name })} />
      <div className="grid gap-6 lg:grid-cols-2">
        <BaseCard>
          <CardHeader icon={Smartphone} title={t('Her details')} />
          <form className="grid gap-4" onSubmit={async (e) => {
            e.preventDefault(); setBusy(true); setErr(null); setCode(null);
            try { const r = await setupMother(phone.trim(), name.trim(), facility!.id); setCode({ ...r, who: name.trim() || phone.trim() }); setPhone(''); setName(''); }
            catch (x) { setErr((x as Error).message); }
            setBusy(false);
          }}>
            <FormField label={t('Phone number')} required hint={t('For example 0712 345 678 or +255712345678.')}><TextInput inputMode="tel" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} /></FormField>
            <FormField label={t('Her name (optional)')} hint={t('Shown to staff at her facility.')}><TextInput autoComplete="off" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></FormField>
            {err && <p role="alert" className="text-small font-semibold text-danger">{err}</p>}
            <Button type="submit" icon={KeyRound} loading={busy} disabled={!okPhone}>{t('Make her code')}</Button>
          </form>
        </BaseCard>
        {code && (
          <BaseCard className="border-primary">
            <CardHeader icon={KeyRound} title={t('Code for {who}', { who: code.who })} subtitle={t('Shown once. It is not saved anywhere you can see again.')} />
            <p className="t-num select-all text-center font-display text-display font-extrabold tracking-widest text-primary" data-setup-code aria-label={t('Code {digits}', { digits: code.code.split('').join(' ') })}>{code.code.slice(0, 4)} {code.code.slice(4)}</p>
            <p className="mt-4 text-body text-ink">{tn('Valid for 24 hours, one use. She opens the app, goes to {button} and types these 8 digits. She stays signed in after that; on a new phone she asks for a new code.', { button: <b>{t('Sign in')}</b> })}</p>
            <p className="t-small mt-2">{t('Expires {date}. Making a new code cancels this one.', { date: fmtDateTime(code.expires_at) })}</p>
            <Button className="mt-4" variant="outline" onClick={() => setCode(null)}>{t('Done: hide the code')}</Button>
          </BaseCard>
        )}
      </div>
    </>
  );
}
