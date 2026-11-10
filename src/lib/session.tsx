// Sign-in and session state.
//   Medical staff entrance: facility (dropdown) + email + password → staff_session() confirms the
//     facility on the server (refusals are logged) → working facility.
//     Super admins and Admins may use it too: after their two-step code they work at the facility
//     they chose (the server allows platform admins at every active facility).
//   Administration entrance: email + password → TOTP MFA (enrolment forced the first time) →
//     admin_session(). For Admins, super admins and the website team (editor, author, clinical
//     reviewer, viewer).
//   Platform admins switch between "Administration" and any facility from the top bar.
//   First sign-in with an invite or a temporary password: choose a new password first.
//   30 minutes without activity: signed out. 5 wrong passwords in 15 minutes: this browser waits 15 minutes
//   (Supabase's own rate limits apply on top).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { adminSession, facilities as listFacilities, myProfile, staffOf, staffSession, mfaRequired } from './api';
import { supabase } from './supabase';
import type { FacilityRef, Role } from './types';
import { tr } from './i18n';

export type Stage = 'loading' | 'signed_out' | 'set_password' | 'mfa_enroll' | 'mfa_verify' | 'ready';
export type Kind = 'staff' | 'admin';
export const STAFF_ROLES: Role[] = ['health_worker', 'facility_admin'];
export const PLATFORM_ROLES: Role[] = ['programme_admin', 'super_admin'];
export const WEB_ROLES: Role[] = ['editor', 'author', 'clinical_reviewer', 'viewer'];
/** Roles that sign in with a two-step code (Administration entrance). */
export const ADMIN_ROLES: Role[] = [...PLATFORM_ROLES, ...WEB_ROLES];

export type WebPower = 'read' | 'write' | 'edit' | 'review' | 'admin';
/** Mirror of public.web_can() (the database decides; this only hides buttons). */
export function webCan(role: Role | null, p: WebPower) {
  if (!role) return false;
  const platform = PLATFORM_ROLES.includes(role);
  switch (p) {
    case 'read': return ADMIN_ROLES.includes(role);
    case 'write': return platform || role === 'editor' || role === 'author';
    case 'edit': return platform || role === 'editor';
    case 'review': return platform || role === 'clinical_reviewer';
    case 'admin': return platform;
  }
}

interface State {
  stage: Stage; kind: Kind | null; role: Role | null; userId: string | null; name: string; email: string;
  facility: FacilityRef | null; facilities: FacilityRef[]; notice: string | null; recovery: boolean;
}
interface Ctx extends State {
  signInStaff(facilityId: string, email: string, password: string): Promise<void>;
  signInAdmin(email: string, password: string): Promise<void>;
  setPassword(password: string): Promise<void>;
  startEnroll(): Promise<{ factorId: string; qr: string; secret: string }>;
  verifyMfa(code: string, factorId?: string): Promise<void>;
  switchFacility(id: string): Promise<void>;
  /** Platform admins: work at a facility (Medical staff view). */
  openFacility(id: string): Promise<void>;
  /** Platform admins: back to Administration (all facilities). */
  openAdministration(): Promise<void>;
  signOut(notice?: string): Promise<void>;
  sendReset(email: string): Promise<void>;
  clearNotice(): void;
  isSuper: boolean; isAdmin: boolean; isFacilityAdmin: boolean; isWebTeam: boolean;
  can(p: WebPower): boolean;
}

const SessionCtx = createContext<Ctx | null>(null);
export const useSession = () => {
  const c = useContext(SessionCtx);
  if (!c) throw new Error('useSession outside SessionProvider');
  return c;
};

const IDLE_MS = 30 * 60 * 1000;
const LOCK_TRIES = 5, LOCK_MS = 15 * 60 * 1000;
const store = {
  get: (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string | null) => { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch { /* private mode */ } },
};
const failKey = (email: string) => `sym.fails.${email.trim().toLowerCase()}`;
function recentFails(email: string): number[] {
  try { return (JSON.parse(localStorage.getItem(failKey(email)) ?? '[]') as number[]).filter((t) => Date.now() - t < LOCK_MS); } catch { return []; }
}
function noteFail(email: string) { try { localStorage.setItem(failKey(email), JSON.stringify([...recentFails(email), Date.now()])); } catch { /* ignore */ } }
function clearFails(email: string) { try { localStorage.removeItem(failKey(email)); } catch { /* ignore */ } }

function signInMessage(e: { message?: string; status?: number }) {
  const m = e.message ?? '';
  if (e.status === 429 || /rate limit|too many/i.test(m)) return tr('Too many attempts. Wait a few minutes, then try again.');
  if (/banned/i.test(m)) return tr('This account is deactivated. Contact your administrator.');
  if (/email not confirmed/i.test(m)) return tr('Open the invite email first to confirm your address.');
  if (/invalid login|invalid credentials/i.test(m)) return tr('Email or password is not right.');
  if (/fetch|network/i.test(m)) return tr('No connection. Check the internet and try again.');
  return tr('Sign-in failed. Try again.');
}

const empty: State = { stage: 'loading', kind: null, role: null, userId: null, name: '', email: '', facility: null, facilities: [], notice: null, recovery: false };

export function SessionProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(empty);
  const patch = useCallback((p: Partial<State>) => setS((x) => ({ ...x, ...p })), []);
  const lastActive = useRef(Date.now());

  const signOut = useCallback(async (notice?: string) => {
    store.set('sym.kind', null); store.set('sym.facility', null);
    await supabase.auth.signOut().catch(() => undefined);
    setS({ ...empty, stage: 'signed_out', notice: notice ?? null });
  }, []);

  /** Two-step code done: open the facility the person chose at sign-in, or Administration. */
  const finishMfa = useCallback(async () => {
    const fac = store.get('sym.facility');
    if (store.get('sym.kind') === 'staff' && fac) {
      const r = await staffSession(fac);
      if (!r.ok) return signOut(r.message ?? tr('This facility could not be opened.'));
      patch({ stage: 'ready', kind: 'staff', role: r.role!, name: r.name ?? '', facility: r.facility ? { id: r.facility.id, name: r.facility.name } : null, facilities: r.facilities ?? [] });
      return;
    }
    store.set('sym.kind', 'admin'); store.set('sym.facility', null);
    const a = await adminSession();
    patch({ stage: 'ready', kind: 'admin', role: a.role, name: a.name, facility: null });
  }, [patch, signOut]);

  /** After the password: two-step code next (or straight on if this session already has it). */
  const mfaNext = useCallback(async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel === 'aal2') return finishMfa();
    // two-step sign-in on hold (super admin switch): email and password are enough
    if (!(await mfaRequired().catch(() => true))) return finishMfa();
    const f = await supabase.auth.mfa.listFactors();
    patch({ stage: f.data?.totp?.some((x) => x.status === 'verified') ? 'mfa_verify' : 'mfa_enroll' });
  }, [finishMfa, patch]);

  // restore a session after a reload
  const restore = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) { setS({ ...empty, stage: 'signed_out' }); return; }
    try {
      const me = await myProfile();
      if (!me) return signOut();
      const base = { userId: me.id, name: me.display_name, email: me.email, role: me.role };
      if (me.mustChange) { patch({ ...base, kind: ADMIN_ROLES.includes(me.role) ? 'admin' : 'staff', stage: 'set_password' }); return; }
      const kind = store.get('sym.kind') as Kind | null;
      if (ADMIN_ROLES.includes(me.role) && kind) { patch({ ...base, kind }); await mfaNext(); return; }
      const fac = store.get('sym.facility');
      if (kind === 'staff' && fac && STAFF_ROLES.includes(me.role) && (await staffOf(fac))) {
        const list = (await listFacilities()).filter((f) => f.active).map((f) => ({ id: f.id, name: f.name }));
        patch({ ...base, kind, facilities: list, facility: list.find((f) => f.id === fac) ?? null, stage: 'ready' });
        return;
      }
      await signOut();
    } catch {
      await signOut(tr('Your session could not be restored. Sign in again.'));
    }
  }, [mfaNext, patch, signOut]);

  useEffect(() => {
    restore();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') patch({ stage: 'set_password', recovery: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [restore, patch]);

  // idle sign-out
  useEffect(() => {
    if (s.stage !== 'ready') return;
    const bump = () => { lastActive.current = Date.now(); };
    const evs = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    bump();
    const t = window.setInterval(() => {
      if (Date.now() - lastActive.current > IDLE_MS) signOut(tr('You were signed out after 30 minutes without activity.'));
    }, 30_000);
    return () => { evs.forEach((e) => window.removeEventListener(e, bump)); window.clearInterval(t); };
  }, [s.stage, signOut]);

  const passwordSignIn = useCallback(async (email: string, password: string) => {
    if (recentFails(email).length >= LOCK_TRIES) throw new Error(tr('Too many wrong passwords. For your safety, wait 15 minutes or reset your password.'));
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      if (/invalid login|invalid credentials/i.test(error.message)) noteFail(email);
      throw new Error(signInMessage(error));
    }
    clearFails(email);
    const me = await myProfile();
    if (!me) { await signOut(); throw new Error(tr('This account has no profile. Contact your administrator.')); }
    return me;
  }, [signOut]);

  /** Accounts with a two-step code: password done, now the code (and then the chosen place). */
  const startMfaAccount = useCallback(async (me: { id: string; display_name: string; email: string; role: Role; mustChange: boolean }, kind: Kind, facility: string | null) => {
    store.set('sym.kind', kind); store.set('sym.facility', facility);
    setS({ ...empty, stage: 'loading', kind, role: me.role, userId: me.id, name: me.display_name, email: me.email });
    if (me.mustChange) patch({ stage: 'set_password' });
    else await mfaNext();
  }, [mfaNext, patch]);

  const signInStaff = useCallback(async (facilityId: string, email: string, password: string) => {
    const me = await passwordSignIn(email, password);
    // Super admins and Admins can work at any facility; the website team goes to its own pages.
    if (PLATFORM_ROLES.includes(me.role)) return startMfaAccount(me, 'staff', facilityId);
    if (WEB_ROLES.includes(me.role)) return startMfaAccount(me, 'admin', null);
    if (!STAFF_ROLES.includes(me.role)) return signOut(tr('This account is for the mother app, not the dashboard.'));
    const r = await staffSession(facilityId);
    if (!r.ok) return signOut(r.message ?? tr('You are not registered at this facility.'));
    store.set('sym.kind', 'staff'); store.set('sym.facility', facilityId);
    setS({ ...empty, stage: me.mustChange ? 'set_password' : 'ready', kind: 'staff', role: r.role!, userId: me.id, name: r.name ?? me.display_name, email: me.email,
      facility: r.facility ? { id: r.facility.id, name: r.facility.name } : null, facilities: r.facilities ?? [] });
  }, [passwordSignIn, signOut, startMfaAccount]);

  const signInAdmin = useCallback(async (email: string, password: string) => {
    const me = await passwordSignIn(email, password);
    if (!ADMIN_ROLES.includes(me.role)) return signOut(STAFF_ROLES.includes(me.role) ? tr('Medical staff sign in under Medical staff, with their facility.') : tr('This account is for the mother app, not the dashboard.'));
    await startMfaAccount(me, 'admin', null);
  }, [passwordSignIn, signOut, startMfaAccount]);

  const setPassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
    if (error) throw new Error(/should be different|same/i.test(error.message) ? tr('Choose a password you have not used here before.') : /weak|short|characters/i.test(error.message) ? tr('Choose a longer password (at least 12 characters, mixing letters and numbers).') : tr('The password could not be saved. Try again.'));
    // After a reset link or an invite (no entrance chosen yet), start again from the sign-in page.
    if (s.recovery || !s.kind || !store.get('sym.kind')) return signOut(tr('Password saved. Sign in with your new password.'));
    if (s.role && ADMIN_ROLES.includes(s.role)) { patch({ stage: 'loading' }); await mfaNext(); }
    else patch({ stage: 'ready' });
  }, [mfaNext, patch, s.kind, s.recovery, s.role, signOut]);

  const startEnroll = useCallback(async () => {
    const all = await supabase.auth.mfa.listFactors();
    for (const f of all.data?.all ?? []) if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Safari ya Mama ${new Date().toISOString().slice(0, 10)}` });
    if (error || !data) throw new Error(tr('Two-step sign-in could not be started. Try again.'));
    return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  }, []);

  const verifyMfa = useCallback(async (code: string, factorId?: string) => {
    let id = factorId;
    if (!id) id = (await supabase.auth.mfa.listFactors()).data?.totp?.find((f) => f.status === 'verified')?.id;
    if (!id) throw new Error(tr('No authenticator is set up for this account.'));
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code: code.replace(/\s/g, '') });
    if (error) throw new Error(/invalid|expired/i.test(error.message) ? tr('That code is not right or has expired. Use the newest code in your authenticator app.') : signInMessage(error));
    await finishMfa();
  }, [finishMfa]);

  const switchFacility = useCallback(async (id: string) => {
    const r = await staffSession(id);
    if (!r.ok) throw new Error(r.message ?? tr('You are not registered at this facility.'));
    store.set('sym.kind', 'staff'); store.set('sym.facility', id);
    patch({ kind: 'staff', facility: r.facility ? { id: r.facility.id, name: r.facility.name } : null, facilities: r.facilities ?? s.facilities, role: r.role ?? s.role });
  }, [patch, s.facilities, s.role]);

  const openAdministration = useCallback(async () => {
    const a = await adminSession();
    store.set('sym.kind', 'admin'); store.set('sym.facility', null);
    patch({ kind: 'admin', facility: null, role: a.role, name: a.name });
  }, [patch]);

  const sendReset = useCallback(async (email: string) => {
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/' });
  }, []);

  const value = useMemo<Ctx>(() => ({
    ...s, signInStaff, signInAdmin, setPassword, startEnroll, verifyMfa, switchFacility, openFacility: switchFacility, openAdministration, signOut, sendReset,
    clearNotice: () => patch({ notice: null }),
    isSuper: s.role === 'super_admin', isAdmin: !!s.role && PLATFORM_ROLES.includes(s.role), isFacilityAdmin: s.role === 'facility_admin',
    isWebTeam: !!s.role && WEB_ROLES.includes(s.role),
    can: (p: WebPower) => webCan(s.role, p),
  }), [s, signInStaff, signInAdmin, setPassword, startEnroll, verifyMfa, switchFacility, openAdministration, signOut, sendReset, patch]);

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
