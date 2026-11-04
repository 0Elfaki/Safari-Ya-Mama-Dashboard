/** Data models. Mother and baby records are separate, linked by `motherId`. */

export type Lang = 'en' | 'sw';
export interface Bilingual {
  en: string;
  sw: string;
}

/** Where a record came from. Demo records are illustrative and never real patient data. */
export type RecordSource = 'demo' | 'user' | 'clinic';

/** Warning level from the shared rules: red = go now, yellow = see a health worker today. */
export type WarningLevel = 'red' | 'yellow' | 'age' | 'green';

export type CareStage = 'pregnancy' | 'birth-soon' | 'postpartum';

export interface HealthRecord {
  id: string;
  date: string; // ISO date
  kind: 'blood-pressure' | 'weight' | 'haemoglobin' | 'note';
  label: string;
  value: string;
  recordedBy: 'clinic' | 'self';
  source: RecordSource;
}

export interface MotherProfile {
  id: string;
  name: string;
  phone?: string;
  /** First day of last period (ISO date). Either this or `edd` dates the pregnancy. */
  lmp?: string;
  /** Estimated due date from the clinic (ISO date). Preferred over `lmp` when both exist. */
  edd?: string;
  /** Set once the baby is born (ISO date). */
  deliveryDate?: string;
  /** Supplements the clinic has prescribed, exactly as recorded. Nothing is assumed. */
  prescribedSupplements: string[];
  records: HealthRecord[];
  source: RecordSource;
}

export interface GrowthRecord {
  id: string;
  date: string;
  weightKg: number;
  lengthCm?: number;
  source: RecordSource;
}

export interface BabyProfile {
  id: string;
  motherId: string;
  name: string;
  birthDate: string;
  birthWeightKg?: number;
  birthFacility?: string;
  growth: GrowthRecord[];
  /** Vaccine schedule groups recorded as given (keys = day of life of the group). */
  vaccinesGiven: number[];
  source: RecordSource;
}

export interface FeedLog {
  id: string;
  babyId: string;
  at: string; // ISO date-time
  kind: 'breast' | 'expressed' | 'other';
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'missed' | 'cancelled';
export type AppointmentType = 'antenatal' | 'postnatal' | 'child-health' | 'vaccination' | 'other';

export interface Appointment {
  id: string;
  type: AppointmentType;
  title: string;
  date: string; // ISO date
  time: string; // HH:mm
  facility: string;
  status: AppointmentStatus;
  notes?: string;
  /** Who the appointment is for. */
  forWhom: 'mother' | 'baby';
  source: RecordSource;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

export interface EmergencyPlan {
  contacts: EmergencyContact[];
  facility: { name: string; phone?: string; address?: string };
  transport: { method: string; contactName?: string; contactPhone?: string; moneySaved: boolean };
  source: RecordSource;
}

export interface DiaryEntry {
  id: string;
  date: string; // ISO date-time
  symptoms: string[];
  dangerSigns: string[]; // keys from the shared danger-sign lists
  note?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  at: string;
  urgent?: 'red' | 'yellow' | null;
}

export type ChecklistCategory = 'daily' | 'supplement' | 'appointment' | 'education';

export interface ChecklistTask {
  id: string;
  title: string;
  /** Why the task is here, e.g. the lesson it comes from. Shown to the mother. */
  basis: string;
  category: ChecklistCategory;
  to?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  to: string;
  tone: 'info' | 'warning';
}

/** Content pack types (generated JSON). */
export interface DangerSign {
  key: string;
  level: WarningLevel;
  en: string;
  sw: string;
}
export interface SourceRef {
  key: string;
  title: string;
  year: number | null;
}
export interface Lesson {
  id: string;
  category: string;
  format: 'video' | 'audio' | 'guide';
  minutes: number;
  stage: 'pregnant' | 'baby' | 'all';
  title: Bilingual;
  steps: { en: string[]; sw: string[] };
  sources: SourceRef[];
  review: { by: string; on: string; due: string } | null;
  art: string[];
}
