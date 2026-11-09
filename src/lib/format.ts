import content from '@/data/content.json';
import { currentLang, msg, tr } from './i18n';
import type { Level, Role } from './types';

const DAY = 864e5;
export const isoDay = (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const daysAgo = (n: number) => isoDay(new Date(Date.now() - n * DAY));
export const toDay = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
export const startOfToday = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
export const daysBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY);

export const fmtDate = (s: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  s ? (s.length <= 10 ? toDay(s) : new Date(s)).toLocaleDateString('en-GB', opts) : '—';
export const fmtDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtNum = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-GB'));
export const fmtPct = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(n * 100)}%`);

/** "12 min", "3 h 5 min", "2 d" since a time. */
export function waited(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 6e4));
  if (m < 60) return tr('{n} min', { n: m });
  if (m < 1440) return m % 60 ? tr('{h} h {m} min', { h: Math.floor(m / 60), m: m % 60 }) : tr('{n} h', { n: Math.floor(m / 60) });
  return tr('{n} d', { n: Math.floor(m / 1440) });
}
export function ago(iso: string | null | undefined) {
  if (!iso) return tr('never');
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 6e4);
  if (m < 1) return tr('just now');
  if (m < 60) return tr('{n} min ago', { n: m });
  if (m < 1440) return tr('{n} h ago', { n: Math.round(m / 60) });
  return tr('{n} d ago', { n: Math.round(m / 1440) });
}

/** 0712 345 123 → "07•• ••• 123" until the record is opened. */
export function maskPhone(p: string | null | undefined) {
  if (!p) return '—';
  const d = p.replace(/\s+/g, '');
  const local = d.startsWith('+255') ? '0' + d.slice(4) : d.startsWith('+') ? d.slice(1) : d;
  return `${local.slice(0, 2)}•• ••• ${local.slice(-3)}`;
}

/** English names; show them with t(roleLabel[role]) / t(levelLabel[level]). */
export const roleLabel: Record<Role, string> = {
  mother: msg('Mother'), caregiver: msg('Caregiver'), health_worker: msg('Health worker'), facility_admin: msg('Facility admin'),
  programme_admin: msg('Admin'), super_admin: msg('Super admin'),
  editor: msg('Website editor'), author: msg('Blog author'), clinical_reviewer: msg('Clinical reviewer'), viewer: msg('Website viewer'),
};
export const levelLabel: Record<Level, string> = { red: msg('Red · go now'), amber: msg('Amber · within 24 h'), green: msg('No warning signs') };
export const LV: Record<Level, number> = { green: 0, amber: 1, red: 2 };
export const worst = (a: Level, b: Level | null | undefined): Level => (b && LV[b] > LV[a] ? b : a);

const signs = content.signs as Record<string, { en: string; sw: string; level: string; stage: string }>;
const EXTRA: Record<string, string> = { bp_rise_20: msg('BP up 20+ mmHg in about 3 weeks') };
/** Sign names come from the bilingual clinical reference (content.json has en and sw). */
export function signLabel(k: string) {
  if (signs[k]) return currentLang() === 'sw' ? signs[k].sw || signs[k].en : signs[k].en;
  const bp = /^bp (\d+)\/(\d+)$/.exec(k);
  return bp ? tr('BP {s}/{d}', { s: bp[1], d: bp[2] }) : EXTRA[k] ? tr(EXTRA[k]) : k.replace(/_/g, ' ');
}
export const vaccineLabel = (k: string) => (content.vaccines as Record<string, string>)[k] ?? k;
export const visitLabel = (kind: string, n: number | null) =>
  kind === 'anc' ? (n == null ? tr('ANC contact of 8') : tr('ANC contact {n} of 8', { n })) : kind === 'pnc' ? (n == null ? tr('Postnatal visit') : tr('Postnatal visit {n}', { n })) : kind === 'immunisation' ? tr('Vaccines') : tr('Appointment');

export function stageText(opts: { weeks?: number | null; babyDays?: number | null; babyName?: string | null }) {
  if (opts.weeks != null) return tr('Pregnant · {n} wk', { n: opts.weeks });
  if (opts.babyDays != null) return `${opts.babyName || tr('Baby')} · ${babyAge(opts.babyDays)}`;
  return tr('Stage not recorded');
}
export const babyAge = (days: number) => (days < 61 ? tr('{n} wk', { n: Math.floor(days / 7) }) : tr('{n} mo', { n: Math.floor(days / 30.44) }));
export const weeksSince = (lmp: string) => Math.floor(daysBetween(startOfToday(), toDay(lmp)) / 7);
