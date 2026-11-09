import clsx from 'clsx';
import { Building2, KeyRound, LogIn, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Logo } from '@/components/layout/Shell';
import { Button } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/StateViews';
import { FormField, Select, TextInput } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { signInFacilities } from '@/lib/api';
import { useSession } from '@/lib/session';
import { configError } from '@/lib/supabase';
import { msg, useT, useTn } from '@/lib/i18n';
import { LanguageSwitch } from '@/components/LanguageSwitch';

function Frame({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: ReactNode }) {
  const t = useT();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-dialog">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Logo sub={t('Dashboard')} /><LanguageSwitch /></div>
        <section className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-8">
          <h1 className="t-h2">{title}</h1>
          {subtitle && <p className="t-small mt-2">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </section>
        <p className="t-caption mx-auto mt-6 max-w-prose text-center">
          {t("Staff see a mother's record only while she shares it with their facility. Every view and action is recorded.")}
        </p>
      </div>
    </main>
  );
}

function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-3">
      <p className="text-small font-semibold text-ink">{text}</p>
      <button type="button" onClick={onClose} className="inline-flex min-h-11 shrink-0 items-center text-small font-semibold text-primary underline">{t('Dismiss')}</button>
    </div>
  );
}

function ForgotPassword({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: string }) {
  const { sendReset } = useSession();
  const [email, setEmail] = useState(initial);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = useT(), tn = useTn();
  useEffect(() => { if (open) { setEmail(initial); setSent(false); } }, [open, initial]);
  return (
    <Modal open={open} onClose={onClose} title={t('Reset your password')} description={t('We email a link that lets you choose a new password.')}>
      {sent ? (
        <p className="text-body text-ink">{tn('If an account uses {email}, a reset link is on its way. Open it on this device. The link expires after an hour.', { email: <b>{email}</b> })}</p>
      ) : (
        <form className="grid gap-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); await sendReset(email).catch(() => undefined); setBusy(false); setSent(true); }}>
          <FormField label={t('Email')} required><TextInput type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></FormField>
          <Button type="submit" icon={Mail} loading={busy} disabled={!/\S+@\S+\.\S+/.test(email)}>{t('Send reset link')}</Button>
        </form>
      )}
    </Modal>
  );
}

export function SignInPage() {
  const s = useSession();
  const [tab, setTab] = useState<'staff' | 'admin'>('staff');
  const [facs, setFacs] = useState<{ id: string; name: string }[] | null>(null);
  const [facErr, setFacErr] = useState<string | null>(null);
  const [facility, setFacility] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const t = useT();

  const loadFacs = () => {
    setFacErr(null);
    signInFacilities().then(setFacs).catch((e) => setFacErr((e as Error).message));
  };
  useEffect(loadFacs, []);

  if (configError) return <Frame title={t('Dashboard not configured')}><ErrorState title={t('Missing settings')} text={configError} /></Frame>;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true); s.clearNotice();
    try {
      if (tab === 'staff') await s.signInStaff(facility, email, password);
      else await s.signInAdmin(email, password);
    } catch (x) { setErr((x as Error).message); }
    setPassword(''); // never keep a password in the form after an attempt
    setBusy(false);
  };

  return (
    <Frame title={t('Sign in')} subtitle={t('Medical staff sign in at the facility they work at today. Administrators and the website team use Administration. Super admins and Admins can use either.')}>
      {s.notice && <Notice text={s.notice} onClose={s.clearNotice} />}
      <div role="tablist" aria-label={t('Who is signing in')} className="mb-6 grid grid-cols-2 gap-1 rounded-md border border-line bg-surface-2 p-1">
        {([['staff', msg('Medical staff'), Building2], ['admin', msg('Administration'), ShieldCheck]] as const).map(([k, label, Icon]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => { setTab(k); setErr(null); }}
            className={clsx('inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-3 text-small font-semibold transition-colors',
              tab === k ? 'bg-surface text-primary shadow-card' : 'text-ink-2 hover:text-ink')}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden /> <span className="min-w-0 py-1 text-center leading-tight">{t(label)}</span>
          </button>
        ))}
      </div>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        {tab === 'staff' && (
          facErr ? <ErrorState title={t('Facilities could not load')} text={facErr} onRetry={loadFacs} /> :
          !facs ? <LoadingState text={t('Loading facilities…')} className="py-2" /> : (
            <FormField label={t('Facility')} required hint={t('The facility you are working at today.')}>
              <Select value={facility} onChange={(e) => setFacility(e.target.value)} required>
                <option value="">{t('Choose your facility')}</option>
                {facs.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </FormField>
          )
        )}
        <FormField label={t('Email')} required><TextInput type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></FormField>
        <FormField label={t('Password')} required><TextInput type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></FormField>
        {err && <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-small font-semibold text-danger">{err}</p>}
        <Button type="submit" icon={LogIn} loading={busy} block disabled={!email || !password || (tab === 'staff' && !facility)}>
          {tab === 'staff' ? t('Sign in at this facility') : t('Continue')}
        </Button>
        <p className="t-caption">{tab === 'admin' ? t('Administration accounts confirm every sign-in with a 6-digit code from an authenticator app.') : t('Super admins and Admins: choose any facility; you confirm with your 6-digit code next.')}</p>
        <button type="button" onClick={() => setForgot(true)} className="inline-flex min-h-11 items-center justify-self-start text-small font-semibold text-primary underline">{t('Forgot password?')}</button>
      </form>
      <ForgotPassword open={forgot} onClose={() => setForgot(false)} initial={email} />
    </Frame>
  );
}

export function SetPasswordPage() {
  const s = useSession();
  const [p1, setP1] = useState(''), [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const t = useT();
  const strong = p1.length >= 12 && /[A-Za-z]/.test(p1) && /\d/.test(p1);
  return (
    <Frame title={s.recovery ? t('Choose a new password') : t('Set your password')} subtitle={s.recovery ? t('Your reset link worked. Choose a new password for the dashboard.') : t('This is your first sign-in. Choose your own password; the temporary one stops working.')}>
      <form className="grid gap-4" onSubmit={async (e) => {
        e.preventDefault(); setErr(null);
        if (!strong) return setErr(t('Use at least 12 characters with letters and numbers.'));
        if (p1 !== p2) return setErr(t('The two passwords are not the same.'));
        setBusy(true);
        try { await s.setPassword(p1); } catch (x) { setErr((x as Error).message); }
        setBusy(false);
      }}>
        <FormField label={t('New password')} required hint={t('At least 12 characters, with letters and numbers.')}><TextInput type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} /></FormField>
        <FormField label={t('Type it again')} required><TextInput type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} /></FormField>
        {err && <p role="alert" className="text-small font-semibold text-danger">{err}</p>}
        <Button type="submit" icon={KeyRound} loading={busy} block>{t('Save password')}</Button>
        <Button variant="ghost" onClick={() => s.signOut()}>{t('Cancel and sign out')}</Button>
      </form>
    </Frame>
  );
}

export function MfaPage({ enroll }: { enroll: boolean }) {
  const s = useSession();
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const t = useT();
  useEffect(() => {
    if (!enroll) return;
    s.startEnroll().then(setSetup).catch((e) => setErr((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enroll]);
  return (
    <Frame title={enroll ? t('Set up two-step sign-in') : t('Enter your sign-in code')}
      subtitle={enroll ? t('Administration and website accounts confirm every sign-in with an authenticator app (Google Authenticator, Microsoft Authenticator or similar).') : t('Open your authenticator app and type the 6-digit code for Safari ya Mama.')}>
      {enroll && (
        setup ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <img src={setup.qr} alt={t('QR code to add Safari ya Mama to your authenticator app')} className="h-48 w-48 rounded-md border border-line bg-white p-2" />
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-small font-semibold text-ink"><Smartphone className="h-4 w-4" aria-hidden /> {t('1. Scan this code with the app')}</p>
              <p className="t-small mt-2">{t('Cannot scan? Enter this key in the app:')}</p>
              <code className="mt-1 block break-all rounded-sm bg-surface-2 px-3 py-2 text-small text-ink">{setup.secret}</code>
              <p className="mt-3 text-small font-semibold text-ink">{t('2. Type the 6-digit code it shows')}</p>
            </div>
          </div>
        ) : !err && <LoadingState text={t('Preparing your code…')} />
      )}
      <form className="grid gap-4" onSubmit={async (e) => {
        e.preventDefault(); setErr(null); setBusy(true);
        try { await s.verifyMfa(code, setup?.factorId); } catch (x) { setErr((x as Error).message); }
        setBusy(false);
      }}>
        <FormField label={t('6-digit code')} required>
          <TextInput inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} />
        </FormField>
        {err && <p role="alert" className="text-small font-semibold text-danger">{err}</p>}
        <Button type="submit" icon={ShieldCheck} loading={busy} block disabled={code.replace(/\s/g, '').length !== 6 || (enroll && !setup)}>
          {enroll ? t('Turn on and continue') : t('Verify')}
        </Button>
        <Button variant="ghost" onClick={() => s.signOut()}>{t('Cancel and sign out')}</Button>
      </form>
    </Frame>
  );
}
