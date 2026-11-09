// Row shapes returned by the Supabase tables and server functions the dashboard uses.
export type Role = 'mother' | 'caregiver' | 'health_worker' | 'facility_admin' | 'programme_admin' | 'super_admin'
  | 'editor' | 'author' | 'clinical_reviewer' | 'viewer';
export type WebRole = 'editor' | 'author' | 'clinical_reviewer' | 'viewer';
export type StaffRole = 'health_worker' | 'facility_admin';
export type AdminRole = 'programme_admin' | 'super_admin';
export type Level = 'green' | 'amber' | 'red';
export type AlertStatus = 'open' | 'acknowledged' | 'contacted' | 'referred' | 'closed';

export interface FacilityRef { id: string; name: string }

export interface Facility {
  id: string; name: string; level: 'dispensary' | 'health_centre' | 'hospital'; district_id: string; district: string;
  country_code: string; country: string; phone: string | null; emergency_24h: boolean; lat: number | null; lng: number | null;
  active: boolean; staff_count: number;
}

export interface Alert {
  id: string; mother_id: string; facility_id: string; source_table: string; source_id: string; level: Level; reasons: string[];
  status: AlertStatus; assigned_to: string | null; created_at: string; acknowledged_at: string | null; closed_at: string | null;
  mother?: { id: string; display_name: string; phone: string | null } | null;
  assigned?: { display_name: string } | null;
}
export interface AlertAction { action: string; note: string | null; created_at: string; actor: { display_name: string } | null }

export interface RiskRow {
  mother_id: string; display_name: string; phone: string | null; stage: 'pregnant' | 'baby' | 'none'; weeks: number | null;
  baby_days: number | null; score: number; band: 'high' | 'medium' | 'low'; reasons: string[];
}

export interface MotherRow { id: string; display_name: string; phone: string | null; home_facility: string | null; lang: string | null; created_at: string }
export interface Pregnancy { id: string; mother_id: string; lmp: string; edd: string; gravida: number | null; parity: number | null; status: string; mother_age: number | null; prev_caesarean: boolean | null; prev_preeclampsia: boolean | null; anaemia: boolean | null }
export interface Baby { id: string; mother_id: string; name: string | null; sex: string | null; dob: string; birth_weight_g: number | null }
export interface Checkin {
  id: string; mother_id: string; baby_id: string | null; stage: string; feeling: string | null; signs: string[]; baby_signs: string[];
  movement: string | null; baby_feeding: string | null; systolic: number | null; diastolic: number | null; level: Level; server_level: Level | null;
  client_created_at: string; note: string | null;
}
export interface BpReading { id: string; systolic: number; diastolic: number; level: Level; server_level: Level | null; client_created_at: string }
export interface Appointment { id: string; mother_id: string; baby_id: string | null; kind: 'anc' | 'pnc' | 'immunisation' | 'other'; contact_no: number | null; due_on: string; attended_on: string | null; note: string | null; facility_id: string | null }
export interface VaccineDose { id: string; mother_id: string; baby_id: string; vaccine_key: string; due_on: string; given_on: string | null }

export interface Person {
  id: string; display_name: string; email: string; role: Role; facilities: { id: string; name: string; active: boolean }[];
  created_at: string; last_sign_in_at: string | null; confirmed: boolean; banned: boolean; mfa: boolean;
}

export interface Kpis {
  facilities: number; staff: number; suppressed: boolean;
  mothers?: number; new_mothers?: number; active_7d?: number; pregnant?: number; postnatal?: number;
  checks?: { total: number; red: number; amber: number };
  alerts?: { red: number; amber: number; open: number; closed: number; median_ack_red_min: number | null; red_ack_30m_pct: number | null };
  anc?: { mothers: number; mean_completed: number | null; anc4_pct: number | null; anc8_pct: number | null; distribution: Record<string, number> | null };
  vaccines?: { key: string; due: number; given: number; on_time: number }[];
  overdue_visits?: number; overdue_vaccines?: number; caregivers?: number;
  notes?: { shared: number; opened: number; opens: number }; ai_questions?: number; lesson_views?: number;
}
export interface KpisExtra {
  suppressed: boolean;
  pregnancy?: { active: number; trimester_1: number; trimester_2: number; trimester_3: number; weeks_36_plus: number; due_14d: number; birth_plan_36w_pct: number | null };
  anc1_before_12w_pct?: number | null; high_bp_women?: number; reduced_movements?: number; kick_sessions?: number;
  baby?: { babies: number; under_1_month: number; growth_monthly_pct: number | null };
  baby_checks?: { total: number; with_danger_signs: number }; vaccines_on_time_pct?: number | null;
  engagement?: { active_30d: number; checking_mothers: number; checks_per_mother: number | null; lessons_completed: number; top_lessons: { lesson: string; views: number }[];
    birth_plans: number; visit_questions: number; medication_plans: number };
}
export interface PlatformKpis {
  checked_at: string; accounts: Partial<Record<Role, number>>; accounts_unconfirmed: number; accounts_without_mfa: number;
  facilities: { active: number; inactive: number; without_staff: number; emergency_24h: number; by_level: Record<string, number> };
  content: { content_version: number; lessons_published: number; lessons_draft: number; lessons_retired: number; lessons_app: number; lessons_web: number;
    lessons_unreviewed: number; app_items_live: number; app_items_pending_review: number; app_pictures: number; site_pictures: number };
  website: { posts_live: number; posts_scheduled: number; posts_draft: number; posts_in_review: number; posts_awaiting_clinical: number; posts_unpublished_changes: number;
    sections_live: number; sections_total: number; sections_changed: number; partners_live: number; partners_proposed: number; impact_live: number; impact_demo_live: number;
    messages_new: number; messages_30d: number };
  usage: { mothers: number | null; caregivers: number | null; mothers_new_30d: number | null; push_devices: number; ai_24h: number; ai_7d: number;
    staff_sign_ins_7d: number; records_opened_7d: number; last_checkin: string | null; notifications_failed_7d: number };
}
export interface DailyRow { day: string; checks: number; red: number; amber: number; active_mothers: number; ai_questions: number; new_mothers: number }
export interface FacilityRow {
  facility_id: string; name: string; level: string; district: string; country_code: string; lat: number | null; lng: number | null; active: boolean;
  mothers: number | null; active_7d: number | null; checks: number | null; red_alerts: number | null; amber_alerts: number | null; open_alerts: number | null;
  median_ack_red_min: number | null; anc4_pct: number | null; overdue_visits: number | null; last_sync: string | null;
  staff: number; logins: number; alerts_handled: number;
}
export interface StaffActivity { staff_id: string; name: string; role: Role; facilities: string | null; logins: number; alerts_handled: number; last_action: string | null; last_sign_in_at: string | null }
export interface AuditRow { id: number; at: string; actor_id: string | null; actor_name: string | null; actor_role: Role | null; action: string; facility_id: string | null; facility_name: string | null; subject: string | null; details: Record<string, unknown> }

export interface SystemHealth {
  checked_at: string;
  cron: { job: string; schedule: string; active: boolean; last: { status: string; start: string; end: string | null; message: string | null } | null; failures_24h: number }[];
  queue: { queued: number; due: number; oldest_due: string | null; sent_24h: number; failed_24h: number; failed_7d: number; by_channel: Record<string, number> };
  failed_recent: { template: string; channel: string; at: string }[];
  push_devices: number;
  ai: { last_24h: number; last_7d: number; per_day: { day: string; n: number }[] };
  data: { last_checkin: string | null; last_mother_signup: string | null; last_staff_sign_in: string | null; mothers: number; caregivers: number; staff: number; admins: number; pending_deletions: number };
  db_size_mb: number;
}

export interface Lesson {
  id: string; category: 'preg' | 'nutri' | 'feed' | 'newborn'; format: 'video' | 'guide' | 'audio'; minutes: number | null; stage: 'pregnant' | 'baby' | 'both';
  art_keys: string[]; published: boolean; sort: number; channels: ('web' | 'app')[]; step_pictures: string[]; status: 'draft' | 'published' | 'retired';
  version: number; updated_at: string; lesson_translations: LessonTr[];
}
export interface LessonTr { lesson_id: string; lang: string; title: string; steps: string[]; audio_path: string | null; reviewed_by: string | null; reviewed_on: string | null }
export interface LessonVersion { id: number; lesson_id: string; version: number; snapshot: { lesson: Partial<Lesson>; tr: Record<string, { title: string; steps: string[]; reviewed_by: string | null; reviewed_on: string | null }> }; published_at: string }

export type SiteSection = 'hero' | 'about' | 'faq' | 'news' | 'partner' | 'page';
export interface SiteContent { key: string; lang: 'en' | 'sw'; section: SiteSection; title: string; body_md: string; image_path: string | null; sort: number; published: boolean; version: number; updated_at: string; archived: boolean }
export interface SiteVersion { id: number; key: string; lang: 'en' | 'sw'; version: number; section: SiteSection; title: string; body_md: string; image_path: string | null; sort: number; published_at: string }

export type AppKind = 'announcement' | 'emergency_numbers' | 'learn_cover' | 'other';
export interface AppContent { key: string; lang: 'en' | 'sw'; kind: AppKind; value: string; country_code: string | null; starts_on: string | null; ends_on: string | null; mentions_symptoms: boolean; reviewed_by: string | null; reviewed_on: string | null; published: boolean; version: number; updated_at: string; archived: boolean }
export interface AppVersion { id: number; key: string; lang: 'en' | 'sw'; version: number; kind: AppKind; value: string; country_code: string | null; starts_on: string | null; ends_on: string | null; mentions_symptoms: boolean; reviewed_by: string | null; reviewed_on: string | null; published_at: string }

export interface District { id: string; country_code: string; name: string }
export interface Country { code: string; name: string }
