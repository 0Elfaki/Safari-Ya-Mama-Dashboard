import {
  Activity, BookOpen, Bot, CalendarDays, KeyRound, MessagesSquare, Building2, Calculator, ClipboardCheck, FileLock2, Gauge, Globe, Handshake, HeartPulse, Image, Inbox, LayoutDashboard,
  Newspaper, Search, ServerCog, ShieldAlert, Siren, Smartphone, Sun, Users, UsersRound, type LucideIcon,
} from 'lucide-react';
import { msg } from '@/lib/i18n';
import type { Role } from '@/lib/types';

/** staff = working at one facility (Medical staff view); admin = Administration (whole platform). */
export type Mode = 'staff' | 'admin' | 'any';
export interface NavItem { to: string; label: string; icon: LucideIcon; roles: Role[]; group: string; mode: Mode }

const PLATFORM: Role[] = ['programme_admin', 'super_admin'];
const HW: Role[] = ['health_worker', 'facility_admin', ...PLATFORM];
const FA: Role[] = ['facility_admin', ...PLATFORM];
const WEB: Role[] = [...PLATFORM, 'editor', 'author', 'clinical_reviewer', 'viewer'];
const WEB_EDIT: Role[] = [...PLATFORM, 'editor'];

/** One list for the sidebar and the route guard: a page is reachable only by the roles listed. */
export const NAV: NavItem[] = [
  { to: '/today', label: msg('Today'), icon: Sun, roles: HW, group: msg('Monitoring'), mode: 'staff' },
  { to: '/alerts', label: msg('Alerts'), icon: Siren, roles: HW, group: msg('Monitoring'), mode: 'staff' },
  { to: '/patients', label: msg('Mothers'), icon: HeartPulse, roles: HW, group: msg('Monitoring'), mode: 'staff' },
  { to: '/appointments', label: msg('Appointments'), icon: CalendarDays, roles: HW, group: msg('Monitoring'), mode: 'staff' },
  { to: '/circle', label: msg("Mothers' circle"), icon: MessagesSquare, roles: HW, group: msg('Monitoring'), mode: 'any' },
  { to: '/note', label: msg("Doctor's Note"), icon: FileLock2, roles: HW, group: msg('Monitoring'), mode: 'staff' },
  { to: '/record', label: msg('Check a record'), icon: ClipboardCheck, roles: HW, group: msg('Monitoring'), mode: 'staff' },
  { to: '/setup-mother', label: msg('Set up a mother'), icon: KeyRound, roles: HW, group: msg('This facility'), mode: 'staff' },
  { to: '/facility', label: msg('Facility KPIs'), icon: Gauge, roles: FA, group: msg('This facility'), mode: 'staff' },
  { to: '/team', label: msg('Team'), icon: UsersRound, roles: FA, group: msg('This facility'), mode: 'staff' },

  { to: '/overview', label: msg('Programme KPIs'), icon: LayoutDashboard, roles: PLATFORM, group: msg('Platform'), mode: 'admin' },
  { to: '/facilities', label: msg('Facilities'), icon: Building2, roles: PLATFORM, group: msg('Platform'), mode: 'admin' },
  { to: '/people', label: msg('People'), icon: Users, roles: PLATFORM, group: msg('Platform'), mode: 'admin' },
  { to: '/activity', label: msg('Activity & audit log'), icon: Activity, roles: PLATFORM, group: msg('Platform'), mode: 'admin' },
  { to: '/system', label: msg('System health'), icon: ServerCog, roles: PLATFORM, group: msg('Platform'), mode: 'admin' },
  { to: '/about-numbers', label: msg('About the numbers'), icon: Calculator, roles: PLATFORM, group: msg('Platform'), mode: 'admin' },

  { to: '/app/lessons', label: msg('Lessons'), icon: BookOpen, roles: PLATFORM, group: msg('Mobile app'), mode: 'admin' },
  { to: '/app/content', label: msg('App content & pictures'), icon: Smartphone, roles: PLATFORM, group: msg('Mobile app'), mode: 'admin' },
  { to: '/app/rules', label: msg('Clinical rules'), icon: ShieldAlert, roles: PLATFORM, group: msg('Mobile app'), mode: 'admin' },

  { to: '/website/pages', label: msg('Pages'), icon: Globe, roles: WEB, group: msg('Website'), mode: 'admin' },
  { to: '/website/blog', label: msg('Blog'), icon: Newspaper, roles: WEB, group: msg('Website'), mode: 'admin' },
  { to: '/website/mamabot', label: msg('MamaBot'), icon: Bot, roles: WEB, group: msg('Website'), mode: 'admin' },
  { to: '/website/media', label: msg('Media library'), icon: Image, roles: WEB, group: msg('Website'), mode: 'admin' },
  { to: '/website/partners', label: msg('Partners & impact'), icon: Handshake, roles: WEB, group: msg('Website'), mode: 'admin' },
  { to: '/website/inbox', label: msg('Inbox'), icon: Inbox, roles: WEB_EDIT, group: msg('Website'), mode: 'admin' },
  { to: '/website/settings', label: msg('SEO & settings'), icon: Search, roles: WEB, group: msg('Website'), mode: 'admin' },
];

export const itemFor = (path: string) => NAV.find((n) => path === n.to || path.startsWith(n.to + '/'));
export const navFor = (role: Role | null, mode: Mode | null) => NAV.filter((n) => role && n.roles.includes(role) && (n.mode === 'any' || n.mode === (mode ?? 'admin')))
  // in Administration the circle sits with the platform pages
  .map((n) => (n.mode === 'any' && mode !== 'staff' ? { ...n, group: msg('Platform') } : n));
export function homeFor(role: Role | null, mode: Mode | null = null) {
  if (!role) return '/';
  if (mode === 'staff') return '/today';
  if (role === 'programme_admin' || role === 'super_admin') return '/overview';
  if (role === 'author' || role === 'clinical_reviewer') return '/website/blog';
  if (role === 'editor' || role === 'viewer') return '/website/pages';
  return '/today';
}
/** English label of the page; show it with t(). */
export const titleFor = (path: string) => itemFor(path)?.label ?? (path.startsWith('/patients/') ? msg('Mother') : '');
