// Appointments, the Mothers' circle and mother account setup (staff side).
// Server: ../safari-ya-mama/supabase/migrations/20261106010000_community_bookings.sql and the Edge
// Functions community, telemed-join and mother-setup.
import { ApiError, friendly } from './api';
import { SUPABASE_URL, supabase } from './supabase';
import { tr } from './i18n';

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args ?? {});
  if (error) throw new ApiError(friendly(error), error.code);
  return data as T;
}
/** POST to an Edge Function and read its JSON, keeping the status (425 too early, 410 ended…). */
async function fn<T>(slug: string, body: unknown): Promise<{ status: number; data: T }> {
  const { data: s } = await supabase.auth.getSession();
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${s.session?.access_token ?? ''}`, 'Content-Type': 'application/json', apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? '' },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!r) throw new ApiError(tr('No connection. Check the internet and try again.'));
  return { status: r.status, data: (await r.json().catch(() => ({}))) as T };
}

// ───────── appointments
export interface Slot { id: string; facility_id: string; staff_id: string | null; starts_at: string; minutes: number; mode: 'clinic' | 'video'; status: 'open' | 'booked' | 'cancelled' }
export interface Booking {
  id: string; facility_id: string; starts_at: string; minutes: number; mode: 'clinic' | 'video'; reason: string | null; status: 'booked' | 'cancelled' | 'done' | 'missed';
  created_at: string; outcome_note: string | null; staff_name: string | null; mother_id: string; mother_name: string; mother_phone: string | null;
}
export const slots = (facility: string, from: string, to: string) => rpc<Slot[]>('staff_slots', { p_facility: facility, p_from: from, p_to: to });
export const bookings = (facility: string, from: string, to: string) => rpc<Booking[]>('staff_bookings', { p_facility: facility, p_from: from, p_to: to });
export const addSlots = (p: { facility: string; mode: 'clinic' | 'video'; first: string; count: number; minutes: number }) =>
  rpc<number>('staff_add_slots', { p_facility: p.facility, p_mode: p.mode, p_first: p.first, p_count: p.count, p_minutes: p.minutes, p_staff: null });
export const cancelSlot = (id: string) => rpc('staff_cancel_slot', { p_slot: id });
export const cancelBooking = (id: string) => rpc('cancel_booking', { p_booking: id });
export const setBookingStatus = (id: string, status: 'done' | 'missed', note: string | null) => rpc('staff_set_booking_status', { p_booking: id, p_status: status, p_note: note });
export async function joinCall(bookingId: string): Promise<{ url?: string; error?: string; opens_at?: string }> {
  const r = await fn<{ url?: string; error?: string; opens_at?: string }>('telemed-join', { booking_id: bookingId });
  if (r.status === 425) return { error: 'too_early', opens_at: r.data.opens_at };
  if (r.status === 410) return { error: 'ended' };
  if (r.status !== 200 || !r.data.url) return { error: r.data.error ?? tr('The call link could not be opened.') };
  return { url: r.data.url };
}
export interface BookingKpis { slots_opened: number; booked: number; fill_rate: number | null; done: number; missed: number; cancelled: number; attendance_rate: number | null;
  video: number; clinic: number; video_both_joined_rate: number | null; median_days_booking_to_visit: number | null; advice_notes_written: number; mothers_served: number | null }
export const bookingKpis = (facility: string | null, from: string, to: string) => rpc<BookingKpis>('booking_kpis', { p_facility: facility, p_from: from, p_to: to });

// ───────── Mothers' circle
export interface CirclePost {
  id: string; parent_id: string | null; topic: string; body: string; anonymous: boolean; author_name: string | null; stage_kind: string | null; stage_value: number | null;
  status: 'published' | 'review' | 'hidden' | 'removed'; urgent: boolean; facts: string[]; staff_post: boolean; health_note: string | null; created_at: string;
  reasons: string[]; ai: { label: string; confidence: number; why: string } | null; report_count: number; reports: string[]; author_strikes: number;
  author_has_name: boolean; parent_body: string | null;
}
export const reviewQueue = () => rpc<CirclePost[]>('community_review_queue', { p_limit: 200 });
export type ModAction = 'publish' | 'hide' | 'remove' | 'remove_strike' | 'note' | 'reset_name';
export const moderate = (id: string, action: ModAction, note: string | null) => rpc('moderate_community_post', { p_post: id, p_action: action, p_note: note });
export async function replyAsStaff(parentId: string, body: string): Promise<{ status?: string; error?: string }> {
  const r = await fn<{ status?: string; error?: string; reasons?: string[] }>('community', { action: 'post', parent_id: parentId, body, topic: 'other', anonymous: false });
  if (r.status !== 200) return { error: r.data.error ?? tr('The reply could not be posted.') };
  if (r.data.status === 'blocked') return { error: tr('The reply was refused by the content check (insulting words).') };
  return { status: r.data.status };
}
export interface CommunityKpis { posts: number; replies: number; active_members: number | null; anonymous_share: number | null; held_for_review_share: number | null; myth_flags: number;
  fact_cards_shown: number; ai_flags: number; urgent_posts: number; median_minutes_to_check: number | null; median_minutes_urgent: number | null; waiting_now: number;
  hidden_by_reports: number; removed: number; staff_answers: number; members_with_strikes: number | null; muted_now: number | null; top_myths: Record<string, number> }
export const communityKpis = (from: string, to: string) => rpc<CommunityKpis>('community_kpis', { p_from: from, p_to: to });

// ───────── mother account setup
export async function setupMother(phone: string, name: string, facility: string | null): Promise<{ code: string; expires_at: string }> {
  const r = await fn<{ code?: string; expires_at?: string; error?: string }>('mother-setup', { action: 'create', phone, name, facility_id: facility });
  if (r.status !== 200 || !r.data.code) throw new ApiError(r.data.error ? r.data.error.charAt(0).toUpperCase() + r.data.error.slice(1) + '.' : tr('The code could not be made. Try again.'));
  return { code: r.data.code, expires_at: r.data.expires_at! };
}

// ───────── website: link check
export async function checkLinks(urls: string[]): Promise<{ url: string; ok: boolean; status: number; note: string }[]> {
  if (!urls.length) return [];
  const r = await fn<{ results?: { url: string; ok: boolean; status: number; note: string }[]; error?: string }>('link-check', { urls });
  if (r.status !== 200) throw new ApiError(r.data.error ?? tr('The links could not be checked.'));
  return r.data.results ?? [];
}

// ───────── website: MamaBot answer library
export interface MamaEntry { id: string; patterns: string[]; answer_en: string; answer_sw: string; urgency: 'red' | 'yellow' | 'none'; source_lesson_id: string | null; reference: string | null;
  reviewed_by: string | null; reviewed_on: string | null; review_hash: string | null; published: boolean; updated_at: string }
export interface SafetyPhrase { id: string; phrase: string; lang: 'en' | 'sw'; urgency: 'red' | 'yellow'; published: boolean; updated_at: string }
export async function mamaEntries(): Promise<MamaEntry[]> {
  const { data, error } = await supabase.from('mamabot_entries').select('*').eq('archived', false).order('updated_at', { ascending: false });
  if (error) throw new ApiError(friendly(error), error.code);
  return (data ?? []) as MamaEntry[];
}
export async function safetyPhrases(): Promise<SafetyPhrase[]> {
  const { data, error } = await supabase.from('safety_phrases').select('*').eq('archived', false).order('lang').order('phrase');
  if (error) throw new ApiError(friendly(error), error.code);
  return (data ?? []) as SafetyPhrase[];
}
export const saveMamaEntry = (e: { id: string | null; patterns: string[]; answer_en: string; answer_sw: string; urgency: string; lesson: string; reference: string }) =>
  rpc<string>('mamabot_entry_save', { p_id: e.id, p_patterns: e.patterns, p_answer_en: e.answer_en, p_answer_sw: e.answer_sw, p_urgency: e.urgency, p_lesson: e.lesson, p_reference: e.reference });
export const reviewMamaEntry = (id: string, reviewer: string | null) => rpc('mamabot_entry_review', { p_id: id, p_reviewer: reviewer });
export const publishMamaEntry = (id: string, on: boolean) => rpc('mamabot_entry_publish', { p_id: id, p_published: on });
export const archiveMamaEntry = (id: string) => rpc('mamabot_entry_archive', { p_id: id });
export const saveSafetyPhrase = (p: { id: string | null; phrase: string; lang: string; urgency: string }) => rpc<string>('safety_phrase_save', { p_id: p.id, p_phrase: p.phrase, p_lang: p.lang, p_urgency: p.urgency });
export const publishSafetyPhrase = (id: string, on: boolean) => rpc('safety_phrase_publish', { p_id: id, p_published: on });
export const archiveSafetyPhrase = (id: string) => rpc('safety_phrase_archive', { p_id: id });

/** The website's matching rule (keep identical to Safari-ya-mam-website/src/services/mamabot.ts). */
export const norm = (s: string) => ` ${s.toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim()} `;
export function matchQuestion(q: string, entries: Pick<MamaEntry, 'id' | 'patterns' | 'urgency'>[], safety: Pick<SafetyPhrase, 'phrase' | 'urgency'>[]) {
  const t = norm(q);
  const hit = (p: string) => norm(p).trim() !== '' && t.includes(norm(p));
  const s = safety.find((x) => hit(x.phrase));
  if (s) return { kind: 'safety' as const, phrase: s.phrase, urgency: s.urgency };
  const rank = { red: 2, yellow: 1, none: 0 };
  let best: { id: string; score: number; matched: string[]; urgency: string } | null = null;
  for (const e of entries) {
    const matched = e.patterns.filter(hit);
    if (!matched.length) continue;
    if (!best || matched.length > best.score || (matched.length === best.score && rank[e.urgency] > rank[best.urgency as keyof typeof rank]))
      best = { id: e.id, score: matched.length, matched, urgency: e.urgency };
  }
  return best ? { kind: 'entry' as const, ...best } : { kind: 'none' as const };
}
