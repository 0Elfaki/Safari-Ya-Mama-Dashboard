// Every call the dashboard makes to Supabase. Permissions are enforced by the database (RLS and
// the server functions in ../safari-ya-mama/supabase/migrations); this file only shapes requests.
import { SUPABASE_URL, supabase } from './supabase';
import { tr } from './i18n';
import type {
  Alert, AlertAction, AlertStatus, AppContent, AppKind, AppVersion, Appointment, AuditRow, Baby, BpReading, Checkin, Country, DailyRow,
  District, Facility, FacilityRow, Kpis, KpisExtra, Lesson, PlatformKpis, LessonVersion, MotherRow, Person, Pregnancy, RiskRow, Role, SiteContent, SiteSection,
  SiteVersion, StaffActivity, SystemHealth, VaccineDose,
} from './types';

/** Plain-words message for a database error (never the raw SQL detail for permission errors). */
export function friendly(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return tr('Something went wrong.');
  if (e.code === '42501' && /not allowed|permission denied/i.test(e.message ?? '')) return tr('You do not have permission to do this.');
  if (e.code === 'PGRST301' || /JWT/i.test(e.message ?? '')) return tr('Your session has ended. Sign in again.');
  if (/Failed to fetch|NetworkError|Load failed/i.test(e.message ?? '')) return tr('No connection. Check the internet and try again.');
  return (e.message ?? tr('Something went wrong.')).replace(/^ERROR:\s*/, '');
}

export class ApiError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new ApiError(friendly(error), error.code);
  return data as T;
}
function must<T>(r: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (r.error) throw new ApiError(friendly(r.error), r.error.code);
  return r.data as T;
}
const today = () => new Date().toISOString().slice(0, 10);

// ───────── sign-in
export const signInFacilities = () => rpc<{ id: string; name: string }[]>('sign_in_facilities');
export const staffSession = (facility: string) =>
  rpc<{ ok: boolean; message?: string; role?: Role; name?: string; facility?: { id: string; name: string; level: string; phone: string | null }; facilities?: { id: string; name: string }[] }>('staff_session', { p_facility: facility });
export const adminSession = () => rpc<{ role: Role; mfa: boolean; name: string }>('admin_session');
export const staffOf = (facility: string) => rpc<boolean>('staff_of', { p_facility: facility });
export async function myProfile() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const p = must(await supabase.from('profiles').select('id,display_name,role').eq('id', u.user.id).maybeSingle()) as { id: string; display_name: string; role: Role } | null;
  return p ? { ...p, email: u.user.email ?? '', mustChange: !!u.user.user_metadata?.must_change_password } : null;
}

// ───────── medical staff (working facility)
export const riskQueue = (facility: string) => rpc<RiskRow[]>('risk_queue', { p_facility: facility }).then((r) => [...r].sort((a, b) => b.score - a.score));
export async function alerts(facility: string): Promise<Alert[]> {
  return must(await supabase.from('alerts')
    .select('*, mother:profiles!alerts_mother_id_fkey(id,display_name,phone), assigned:profiles!alerts_assigned_to_fkey(display_name)')
    .eq('facility_id', facility).order('created_at', { ascending: false }).limit(400)) as Alert[];
}
export async function alertActions(alertId: string): Promise<AlertAction[]> {
  return must(await supabase.from('alert_actions').select('action,note,created_at, actor:profiles(display_name)').eq('alert_id', alertId).order('created_at')) as unknown as AlertAction[];
}
export const setAlertStatus = (id: string, status: AlertStatus, note: string | null) => rpc('set_alert_status', { p_alert: id, p_status: status, p_note: note });
export const assignAlert = (id: string, staff: string | null) => rpc('assign_alert', { p_alert: id, p_staff: staff });

/** Mothers who share with this facility (RLS hides everyone else), with what the lists need. */
export async function patients(facility: string) {
  const since = new Date(Date.now() - 60 * 864e5).toISOString();
  const [p, pr, bb, ck, al, ap] = await Promise.all([
    supabase.from('profiles').select('id,display_name,phone,home_facility,lang,created_at').eq('role', 'mother').eq('home_facility', facility).order('display_name'),
    supabase.from('pregnancies').select('id,mother_id,lmp,edd,status').eq('status', 'active'),
    supabase.from('babies').select('id,mother_id,name,dob'),
    supabase.from('checkins').select('mother_id,level,server_level,client_created_at,signs,baby_signs').gte('client_created_at', since).order('client_created_at', { ascending: false }),
    supabase.from('alerts').select('mother_id,level,status').eq('facility_id', facility).neq('status', 'closed'),
    supabase.from('appointments').select('id,mother_id,kind,contact_no,due_on,attended_on').is('attended_on', null).order('due_on'),
  ]);
  return {
    mothers: must(p) as MotherRow[], pregnancies: must(pr) as Pregnancy[], babies: must(bb) as Baby[],
    checkins: must(ck) as Pick<Checkin, 'mother_id' | 'level' | 'server_level' | 'client_created_at' | 'signs' | 'baby_signs'>[],
    openAlerts: must(al) as Pick<Alert, 'mother_id' | 'level' | 'status'>[], appointments: must(ap) as Appointment[],
  };
}
export async function dueSoon(facility: string) {
  const from = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10), to = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const [m, ap, vx] = await Promise.all([
    supabase.from('profiles').select('id,display_name,phone').eq('role', 'mother').eq('home_facility', facility),
    supabase.from('appointments').select('id,mother_id,baby_id,kind,contact_no,due_on,attended_on,note,facility_id').is('attended_on', null).gte('due_on', today()).lte('due_on', to).order('due_on'),
    supabase.from('vaccine_doses').select('id,mother_id,baby_id,vaccine_key,due_on,given_on').is('given_on', null).gte('due_on', from).lt('due_on', today()).order('due_on'),
  ]);
  const mothers = must(m) as Pick<MotherRow, 'id' | 'display_name' | 'phone'>[];
  const ids = new Set(mothers.map((x) => x.id));
  return { mothers, visits: (must(ap) as Appointment[]).filter((a) => ids.has(a.mother_id)), overdueVaccines: (must(vx) as VaccineDose[]).filter((v) => ids.has(v.mother_id)) };
}
export async function patient(id: string) {
  const q = (t: string) => supabase.from(t).select('*').eq('mother_id', id);
  const [p, pr, bb, ck, bp, ap, vx, al, cg] = await Promise.all([
    supabase.from('profiles').select('id,display_name,phone,home_facility,lang,created_at').eq('id', id).maybeSingle(),
    q('pregnancies').is('deleted_at', null).order('created_at', { ascending: false }).limit(1),
    q('babies').is('deleted_at', null).order('dob', { ascending: false }),
    q('checkins').is('deleted_at', null).order('client_created_at', { ascending: false }).limit(90),
    q('bp_readings').is('deleted_at', null).order('client_created_at'),
    q('appointments').is('deleted_at', null).order('due_on'),
    q('vaccine_doses').order('due_on'),
    q('alerts').order('created_at', { ascending: false }),
    supabase.rpc('staff_caregivers', { p_mother: id }),
  ]);
  const profile = must(p) as MotherRow | null;
  if (!profile) throw new ApiError(tr('This mother is not sharing her record with your facility.'), 'P0002');
  return {
    profile, pregnancy: ((must(pr) as Pregnancy[])[0] ?? null), babies: must(bb) as Baby[], checkins: must(ck) as Checkin[], bp: must(bp) as BpReading[],
    appointments: must(ap) as Appointment[], vaccines: must(vx) as VaccineDose[], alerts: must(al) as Alert[],
    caregivers: (cg.error ? [] : cg.data) as { name: string; relation: string; since: string }[],
  };
}
export const logView = (mother: string, what = 'record') => rpc('log_view', { p_mother: mother, p_what: what });
export async function markAttended(id: string, on: boolean) {
  must(await supabase.from('appointments').update({ attended_on: on ? today() : null, updated_at: new Date().toISOString() }).eq('id', id).select('id'));
}
export async function markGiven(id: string, on: boolean, facility: string) {
  must(await supabase.from('vaccine_doses').update({ given_on: on ? today() : null, facility_id: on ? facility : null, updated_at: new Date().toISOString() }).eq('id', id).select('id'));
}
export const facilityKpis = (f: string, from: string, to: string) =>
  rpc<{ mothers_sharing: number; checkins: number; red_alerts: number; amber_alerts: number; median_ack_minutes: number | null; anc4_rate: number | null; visits_missed: number }[]>('facility_kpis', { p_facility: f, p_from: from, p_to: to }).then((r) => r[0]);
export const facilityDaily = (f: string, from: string, to: string) => rpc<{ day: string; checks: number; red: number; amber: number }[]>('facility_daily', { p_facility: f, p_from: from, p_to: to });
export const childKpis = (f: string, from: string, to: string) =>
  rpc<{ checks: number; children: number; green: number; amber: number; red: number; top_signs: { sign: string; n: number }[] }[]>('child_check_kpis', { p_facility: f, p_from: from, p_to: to }).then((r) => r[0]);
export const openNoteShare = (id: string) => rpc<{ ciphertext: string; sections: string[]; created_at: string; expires_at: string }[]>('open_note_share', { p_id: id }).then((r) => r[0]);
export const verifyRecordProof = (hash: string) =>
  rpc<{ proof_id: string; ledger_seq: number; issued_at: string; record_doc: { vaccines: { vaccine_key: string; due_on: string; given_on: string | null }[]; visits: { kind: string; contact_no: number | null; due_on: string; attended_on: string | null }[] }; chain_ok: boolean }[]>('verify_record_proof', { p_hash: hash }).then((r) => r[0] ?? null);

// ───────── people and facilities
export const people = (facility?: string | null) => rpc<Person[]>('admin_people', { p_facility: facility ?? null });
export const assignStaff = (staff: string, facility: string, active: boolean) => rpc('admin_assign_staff', { p_staff: staff, p_facility: facility, p_active: active });
export const setRole = (user: string, role: Role) => rpc('admin_set_role', { p_user: user, p_role: role });
export const facilities = () => rpc<Facility[]>('admin_facilities');
export const saveFacility = (f: { id: string | null; name: string; level: string; district_id: string; phone: string | null; emergency_24h: boolean; lat: number | null; lng: number | null }) =>
  rpc<string>('admin_save_facility', { p_id: f.id, p_name: f.name, p_level: f.level, p_district: f.district_id, p_phone: f.phone, p_emergency_24h: f.emergency_24h, p_lat: f.lat, p_lng: f.lng });
export const setFacilityActive = (id: string, active: boolean) => rpc('admin_set_facility_active', { p_id: id, p_active: active });
export const saveDistrict = (country: string, name: string) => rpc<string>('admin_save_district', { p_country: country, p_name: name });
export async function geography() {
  const [c, d] = await Promise.all([supabase.from('countries').select('code,name').order('name'), supabase.from('districts').select('id,country_code,name').order('name')]);
  return { countries: must(c) as Country[], districts: must(d) as District[] };
}

/** The admin-users Edge Function (service role stays on the server). */
export async function adminUsers<T = { ok: true }>(body: Record<string, unknown>): Promise<T & { temp_password?: string; user_id?: string }> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    let msg = tr('The account service did not answer. Try again.');
    try { msg = (await (error as { context?: Response }).context?.json())?.error ?? msg; } catch { /* keep default */ }
    throw new ApiError(msg);
  }
  return data;
}

// ───────── whole system (admins)
type Scope = { from: string; to: string; country?: string | null; district?: string | null; facility?: string | null };
const scopeArgs = (s: Scope) => ({ p_from: s.from, p_to: s.to, p_country: s.country || null, p_district: s.district || null, p_facility: s.facility || null });
export const kpis = (s: Scope) => rpc<Kpis>('admin_kpis', scopeArgs(s));
export const kpisExtra = (s: Scope) => rpc<KpisExtra>('admin_kpis_extra', scopeArgs(s));
export const platformKpis = () => rpc<PlatformKpis>('platform_kpis');
export const daily = (s: Scope) => rpc<DailyRow[]>('admin_daily', scopeArgs(s));
export const facilityTable = (s: Scope) => rpc<FacilityRow[]>('admin_facility_table', { p_from: s.from, p_to: s.to, p_country: s.country || null, p_district: s.district || null });
export const staffActivity = (from: string, to: string, facility?: string | null) => rpc<StaffActivity[]>('admin_staff_activity', { p_from: from, p_to: to, p_facility: facility || null });
export const audit = (f: { from?: string | null; to?: string | null; actor?: string | null; action?: string | null; facility?: string | null; before?: number | null; limit?: number }) =>
  rpc<AuditRow[]>('admin_audit', { p_from: f.from || null, p_to: f.to || null, p_actor: f.actor || null, p_action: f.action || null, p_facility: f.facility || null, p_limit: f.limit ?? 100, p_before: f.before ?? null });
export const auditActions = () => rpc<{ action: string; n: number }[]>('admin_audit_actions');
export const systemHealth = () => rpc<SystemHealth>('admin_system');

/** Edge Function status: GET with the user's token. 404 = not deployed; any other answer = running. */
export async function functionStatus(slug: string): Promise<'running' | 'not_deployed' | 'unreachable'> {
  try {
    const { data } = await supabase.auth.getSession();
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, { method: 'GET', headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } });
    return r.status === 404 ? 'not_deployed' : 'running';
  } catch {
    return 'unreachable';
  }
}

// ───────── content (admins)
export async function lessons(): Promise<Lesson[]> {
  return must(await supabase.from('lessons').select('*, lesson_translations(*)').order('sort').order('id')) as Lesson[];
}
export async function saveLesson(id: string, patch: Partial<Pick<Lesson, 'category' | 'format' | 'minutes' | 'stage' | 'channels' | 'step_pictures' | 'sort'>>) {
  must(await supabase.from('lessons').update(patch).eq('id', id).select('id'));
}
export async function createLesson(l: Pick<Lesson, 'id' | 'category' | 'format' | 'minutes' | 'stage'>) {
  must(await supabase.from('lessons').insert({ ...l, sort: 500 }).select('id'));
}
export async function saveTranslation(lessonId: string, lang: 'en' | 'sw', title: string, steps: string[]) {
  must(await supabase.from('lesson_translations').upsert({ lesson_id: lessonId, lang, title, steps }, { onConflict: 'lesson_id,lang' }).select('lesson_id'));
}
export const publishLesson = (id: string, reviewer: string | null, on: string | null) => rpc<number>('lesson_publish', { p_id: id, p_reviewer: reviewer, p_reviewed_on: on });
export const setLessonStatus = (id: string, status: 'draft' | 'retired') => rpc('lesson_set_status', { p_id: id, p_status: status });
export const restoreLesson = (id: string, version: number) => rpc('lesson_restore', { p_id: id, p_version: version });
export async function lessonVersions(id: string): Promise<LessonVersion[]> {
  return must(await supabase.from('lesson_versions').select('*').eq('lesson_id', id).order('version', { ascending: false })) as LessonVersion[];
}

export async function siteContent(): Promise<SiteContent[]> { return must(await supabase.from('site_content').select('*').order('section').order('sort').order('key')) as SiteContent[]; }
export async function siteVersions(key: string): Promise<SiteVersion[]> { return must(await supabase.from('site_content_versions').select('*').eq('key', key).order('version', { ascending: false })) as SiteVersion[]; }
export const saveSite = (p: { key: string; section: SiteSection; sort: number; image_path: string | null; en: { title: string; body: string }; sw: { title: string; body: string } }) =>
  rpc('site_content_save', { p_key: p.key, p_section: p.section, p_sort: p.sort, p_image_path: p.image_path, p_en_title: p.en.title, p_en_body: p.en.body, p_sw_title: p.sw.title, p_sw_body: p.sw.body });
export const publishSite = (key: string) => rpc<number>('site_content_publish', { p_key: key });
export const unpublishSite = (key: string) => rpc('site_content_unpublish', { p_key: key });
export const restoreSite = (key: string, version: number) => rpc('site_content_restore', { p_key: key, p_version: version });
export const archiveSite = (key: string, archived: boolean) => rpc('site_content_archive', { p_key: key, p_archived: archived });

export async function appContent(): Promise<AppContent[]> { return must(await supabase.from('app_content').select('*').order('kind').order('key')) as AppContent[]; }
export async function appVersions(key: string): Promise<AppVersion[]> { return must(await supabase.from('app_content_versions').select('*').eq('key', key).order('version', { ascending: false })) as AppVersion[]; }
export const saveApp = (p: { key: string; kind: AppKind; country: string | null; starts: string | null; ends: string | null; en: string; sw: string; symptoms: boolean }) =>
  rpc('app_content_save', { p_key: p.key, p_kind: p.kind, p_country: p.country, p_starts: p.starts, p_ends: p.ends, p_en: p.en, p_sw: p.sw, p_mentions_symptoms: p.symptoms });
export const publishApp = (key: string, reviewer: string | null, on: string | null) => rpc<number>('app_content_publish', { p_key: key, p_reviewer: reviewer, p_reviewed_on: on });
export const unpublishApp = (key: string) => rpc('app_content_unpublish', { p_key: key });
export const restoreApp = (key: string, version: number) => rpc('app_content_restore', { p_key: key, p_version: version });
export const archiveApp = (key: string, archived: boolean) => rpc('app_content_archive', { p_key: key, p_archived: archived });
export const manifest = () => rpc<{ content_version: number; generated_at: string; lessons: unknown[]; content: Record<string, unknown> }>('app_content_manifest');

export async function listMedia(bucket: 'app-media' | 'site-media') {
  const { data, error } = await supabase.storage.from(bucket).list('', { limit: 500, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw new ApiError(friendly(error));
  return (data ?? []).filter((f) => f.id);
}
export async function uploadMedia(bucket: 'app-media' | 'site-media', name: string, blob: Blob) {
  const { error } = await supabase.storage.from(bucket).upload(name, blob, { upsert: true, contentType: blob.type, cacheControl: '3600' });
  if (error) throw new ApiError(friendly(error));
}
export async function removeMedia(bucket: 'app-media' | 'site-media', name: string) {
  const { error } = await supabase.storage.from(bucket).remove([name]);
  if (error) throw new ApiError(friendly(error));
}

export type { Kpis, Lesson };
