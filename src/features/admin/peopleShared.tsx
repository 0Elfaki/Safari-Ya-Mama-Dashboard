import { Ban, Copy, KeyRound, Mail, RefreshCw, ShieldCheck, UserPlus, UserRoundCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Bits';
import { Button } from '@/components/ui/Button';
import { FormField, Select, TextInput } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { adminUsers, assignStaff, setRole } from '@/lib/api';
import { ago, roleLabel } from '@/lib/format';
import { msg, useT } from '@/lib/i18n';
import type { FacilityRef, Person, Role } from '@/lib/types';

/** UI mirror of can_manage_account / can_manage_user (the server makes the real decision). */
const WEB: Role[] = ['editor', 'author', 'clinical_reviewer', 'viewer'];
export function creatableRoles(me: Role | null): Role[] {
  if (me === 'super_admin') return ['health_worker', 'facility_admin', 'programme_admin', 'super_admin', ...WEB];
  if (me === 'programme_admin') return ['health_worker', ...WEB];
  if (me === 'facility_admin') return ['health_worker'];
  return [];
}
/** Roles this person may be moved to (mirror of admin_set_role). */
function roleChoices(me: Role | null, current: Role): Role[] {
  const all: Role[] = ['health_worker', 'facility_admin', 'programme_admin', 'super_admin', ...WEB];
  if (me === 'super_admin') return all.filter((r) => r !== current);
  if (me === 'programme_admin' && WEB.includes(current)) return WEB.filter((r) => r !== current);
  return [];
}
export function canManage(me: Role | null, myId: string | null, myFacilities: string[], p: Person) {
  if (p.id === myId) return false;
  if (['super_admin', 'programme_admin', 'facility_admin'].includes(p.role)) return me === 'super_admin';
  if (p.role === 'health_worker') return me === 'super_admin' || me === 'programme_admin' || (me === 'facility_admin' && p.facilities.some((f) => myFacilities.includes(f.id)));
  if (WEB.includes(p.role)) return me === 'super_admin' || me === 'programme_admin';
  return false;
}

export function PersonStatus({ p }: { p: Person }) {
  const t = useT();
  if (p.banned) return <StatusBadge tone="danger" icon={Ban}>{t('Deactivated')}</StatusBadge>;
  if (!p.confirmed) return <StatusBadge tone="warning" icon={Mail}>{t('Invite not accepted')}</StatusBadge>;
  return <StatusBadge tone="success" icon={UserRoundCheck}>{t('Active')}</StatusBadge>;
}

function TempPassword({ value }: { value: string }) {
  const toast = useToast();
  const t = useT();
  return (
    <div className="rounded-md border border-warning/30 bg-warning-soft p-4">
      <p className="text-small font-semibold text-ink">{t('Temporary password: shown once')}</p>
      <p className="t-small mt-1 text-ink">{t('Give it to the person in private. They must choose their own password when they first sign in. It is not stored anywhere and cannot be shown again.')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded-sm bg-surface px-3 py-2 font-body text-body font-semibold tracking-wide text-ink" data-temp-password>{value}</code>
        <Button size="sm" variant="outline" icon={Copy} onClick={async () => { try { await navigator.clipboard.writeText(value); toast(t('Copied')); } catch { toast(t('Select the text and copy it'), 'bad'); } }}>{t('Copy')}</Button>
      </div>
    </div>
  );
}

export function InviteModal({ open, onClose, roles, facilities, fixedFacility, onDone }: {
  open: boolean; onClose: () => void; roles: Role[]; facilities: FacilityRef[]; fixedFacility?: FacilityRef; onDone: () => void;
}) {
  const toast = useToast();
  const t = useT();
  const [name, setName] = useState(''), [email, setEmail] = useState('');
  const [role, setRoleV] = useState<Role>(roles[0] ?? 'health_worker');
  const [facility, setFacility] = useState(fixedFacility?.id ?? '');
  const [method, setMethod] = useState<'invite' | 'temp_password'>('invite');
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  // reset only when the dialog opens (the parent re-renders while it is open)
  useEffect(() => { if (open) { setName(''); setEmail(''); setRoleV(roles[0] ?? 'health_worker'); setFacility(fixedFacility?.id ?? ''); setMethod('invite'); setErr(null); setTemp(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const needsFacility = role === 'health_worker' || role === 'facility_admin';

  const submit = async () => {
    setErr(null); setBusy(true);
    try {
      const r = await adminUsers({ action: 'create', email, display_name: name, role, facility_id: needsFacility ? facility : null, method });
      onDone();
      if (r.temp_password) setTemp(r.temp_password);
      else { toast(t('Invite sent to {email}', { email })); onClose(); }
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <Modal open={open} onClose={() => { setTemp(null); onClose(); }} title={temp ? t('Account created') : t('Add a person')} description={temp ? undefined : t('They receive an email to choose a password, or you give them a one-time temporary password.')}
      footer={temp ? <Button onClick={() => { setTemp(null); onClose(); }}>{t('Done')}</Button> : <>
        <Button variant="outline" onClick={onClose}>{t('Cancel')}</Button>
        <Button icon={UserPlus} loading={busy} onClick={submit} disabled={name.trim().length < 2 || !/\S+@\S+\.\S+/.test(email) || (needsFacility && !facility)}>
          {method === 'invite' ? t('Send invite') : t('Create account')}
        </Button></>}>
      {temp ? <TempPassword value={temp} /> : (
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <FormField label={t('Full name')} required><TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="off" /></FormField>
          <FormField label={t('Email')} required hint={t('Used to sign in. Never shown to mothers.')}><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" /></FormField>
          {roles.length > 1 && (
            <FormField label={t('Role')} required>
              <Select value={role} onChange={(e) => setRoleV(e.target.value as Role)}>{roles.map((r) => <option key={r} value={r}>{t(roleLabel[r])}</option>)}</Select>
            </FormField>
          )}
          {needsFacility && (fixedFacility ? <p className="t-small">{t('Facility:')} <b className="text-ink">{fixedFacility.name}</b></p> : (
            <FormField label={t('Facility')} required>
              <Select value={facility} onChange={(e) => setFacility(e.target.value)}>
                <option value="">{t('Choose a facility')}</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            </FormField>
          ))}
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-small font-semibold text-ink">{t('How they get in')}</legend>
            {([['invite', msg('Email an invite link'), msg('Best: they choose their own password.')], ['temp_password', msg('Temporary password'), msg('When email is not possible. Shown once here; they must change it at first sign-in.')]] as const).map(([v, l, h]) => (
              <label key={v} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-line p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                <input type="radio" name="method" className="h-6 w-6 shrink-0 accent-primary" checked={method === v} onChange={() => setMethod(v)} />
                <span><span className="block text-small font-semibold text-ink">{t(l)}</span><span className="t-caption">{t(h)}</span></span>
              </label>
            ))}
          </fieldset>
          {!needsFacility && <p className="t-caption flex items-center gap-1"><ShieldCheck className="h-4 w-4" aria-hidden /> {t('They sign in under Administration and set up two-step sign-in the first time.')}{WEB.includes(role) ? ` ${t('Website roles see only the Website section, never mothers.')}` : ''}</p>}
          {err && <p role="alert" className="text-small font-semibold text-danger">{err}</p>}
        </form>
      )}
    </Modal>
  );
}

/** Account actions: re-invite, reset, temporary password, deactivate / reactivate, facility access, role. */
export function ManageModal({ person, onClose, onDone, facilities, me, scopeFacility }: {
  person: Person | null; onClose: () => void; onDone: () => void; facilities: FacilityRef[]; me: Role | null; scopeFacility?: FacilityRef;
}) {
  const toast = useToast();
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [temp, setTemp] = useState<string | null>(null);
  const [addFac, setAddFac] = useState('');
  const [newRole, setNewRole] = useState<Role | ''>('');
  useEffect(() => { setTemp(null); setAddFac(''); setNewRole(''); }, [person?.id]);
  if (!person) return null;
  const p = person;
  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try { await fn(); toast(done); onDone(); } catch (e) { toast((e as Error).message, 'bad'); }
    setBusy(null);
  };
  const works = p.role === 'health_worker' || p.role === 'facility_admin';
  const canAssign = works && (p.role === 'health_worker' || me === 'super_admin');
  const choices = (scopeFacility ? [scopeFacility] : facilities).filter((f) => !p.facilities.some((x) => x.id === f.id && x.active));

  return (
    <Modal open onClose={onClose} title={p.display_name} description={`${t(roleLabel[p.role])} · ${p.email}`} footer={<Button variant="outline" onClick={onClose}>{t('Close')}</Button>}>
      {temp && <div className="mb-5"><TempPassword value={temp} /></div>}
      <div className="flex flex-wrap items-center gap-2"><PersonStatus p={p} />{!['health_worker', 'facility_admin'].includes(p.role) && (p.mfa ? <StatusBadge tone="success" icon={ShieldCheck}>{t('Two-step on')}</StatusBadge> : <StatusBadge tone="warning">{t('Two-step not set up')}</StatusBadge>)}</div>
      <p className="t-small mt-2">{t('Last sign-in {ago}', { ago: ago(p.last_sign_in_at) })}</p>

      <h3 className="t-h3 mt-6">{t('Sign-in')}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {!p.confirmed && <Button size="sm" variant="outline" icon={Mail} loading={busy === 'resend'} onClick={() => run('resend', () => adminUsers({ action: 'resend_invite', user_id: p.id }), t('Invite sent again'))}>{t('Resend invite')}</Button>}
        {p.confirmed && <Button size="sm" variant="outline" icon={Mail} loading={busy === 'reset'} onClick={() => run('reset', () => adminUsers({ action: 'reset_password', user_id: p.id, method: 'email' }), t('Reset email sent'))}>{t('Email a reset link')}</Button>}
        <Button size="sm" variant="outline" icon={KeyRound} loading={busy === 'temp'} onClick={async () => {
          setBusy('temp');
          try { const r = await adminUsers({ action: 'reset_password', user_id: p.id, method: 'temp_password' }); setTemp(r.temp_password ?? null); onDone(); } catch (e) { toast((e as Error).message, 'bad'); }
          setBusy(null);
        }}>{t('Temporary password')}</Button>
        {p.banned
          ? <Button size="sm" icon={RefreshCw} loading={busy === 'on'} onClick={() => run('on', () => adminUsers({ action: 'reactivate', user_id: p.id }), t('Account reactivated'))}>{t('Reactivate')}</Button>
          : <Button size="sm" variant="outline" icon={Ban} className="text-danger" loading={busy === 'off'} onClick={() => { if (confirm(t('Deactivate {name}? They can no longer sign in. Nothing is deleted.', { name: p.display_name }))) run('off', () => adminUsers({ action: 'deactivate', user_id: p.id }), t('Account deactivated')); }}>{t('Deactivate')}</Button>}
      </div>

      {works && (
        <>
          <h3 className="t-h3 mt-6">{t('Facilities')}</h3>
          <ul className="mt-3 flex flex-col divide-y divide-line">
            {p.facilities.filter((f) => f.active).map((f) => (
              <li key={f.id} className="flex min-h-11 items-center justify-between gap-3 py-2">
                <span className="text-small font-semibold text-ink">{f.name}</span>
                {canAssign && (!scopeFacility || scopeFacility.id === f.id) && (
                  <Button size="sm" variant="ghost" loading={busy === `rm-${f.id}`} onClick={() => run(`rm-${f.id}`, () => assignStaff(p.id, f.id, false), t('Removed from {name}', { name: f.name }))}>{t('Remove')}</Button>
                )}
              </li>
            ))}
            {!p.facilities.some((f) => f.active) && <li className="t-small py-2">{t('Not assigned to any facility.')}</li>}
          </ul>
          {canAssign && choices.length > 0 && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <FormField label={t('Add to facility')} className="min-w-0 flex-1">
                <Select value={addFac} onChange={(e) => setAddFac(e.target.value)}><option value="">{t('Choose…')}</option>{choices.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select>
              </FormField>
              <Button disabled={!addFac} loading={busy === 'add'} onClick={() => run('add', () => assignStaff(p.id, addFac, true), t('Facility added'))}>{t('Add')}</Button>
            </div>
          )}
        </>
      )}

      {roleChoices(me, p.role).length > 0 && (
        <>
          <h3 className="t-h3 mt-6">{t('Role')}</h3>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <FormField label={t('Change role to')} className="min-w-0 flex-1">
              <Select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                <option value="">{t('Keep {role}', { role: t(roleLabel[p.role]) })}</option>
                {roleChoices(me, p.role).map((r) => <option key={r} value={r}>{t(roleLabel[r])}</option>)}
              </Select>
            </FormField>
            <Button disabled={!newRole} loading={busy === 'role'} onClick={() => { if (newRole && confirm(t('Make {name} {role}?', { name: p.display_name, role: t(roleLabel[newRole]) }))) run('role', () => setRole(p.id, newRole), t('Role changed')); }}>{t('Change')}</Button>
          </div>
          <p className="t-caption mt-2">{t("Only health workers and facility admins keep facility access. Website roles never see mothers' data.")}</p>
        </>
      )}
    </Modal>
  );
}
