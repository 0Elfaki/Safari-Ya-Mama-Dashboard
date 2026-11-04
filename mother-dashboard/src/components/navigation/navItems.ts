import { Baby, BookOpen, CalendarDays, HeartPulse, Home, MessageCircleHeart, Settings, ShieldAlert, Sprout, UserRound, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the phone bottom bar. */
  mobile?: string;
  tone?: 'danger';
}

/** One list drives the sidebar, the mobile drawer and the bottom bar. */
export const navItems: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, mobile: 'Home' },
  { to: '/care', label: 'My Care', icon: HeartPulse, mobile: 'My Care' },
  { to: '/pregnancy', label: 'My Pregnancy', icon: Sprout },
  { to: '/baby', label: 'My Baby', icon: Baby },
  { to: '/mamabot', label: 'MamaBot', icon: MessageCircleHeart, mobile: 'MamaBot' },
  { to: '/library', label: 'Health Library', icon: BookOpen, mobile: 'Learn' },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/emergency', label: 'Emergency Plan', icon: ShieldAlert, tone: 'danger' },
  { to: '/profile', label: 'My Profile', icon: UserRound, mobile: 'Profile' },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const titleFor = (path: string) => {
  if (path === '/') return 'Home';
  const hit = navItems.filter((n) => n.to !== '/' && path.startsWith(n.to)).sort((a, b) => b.to.length - a.to.length)[0];
  return hit?.label ?? 'Safari ya Mama';
};
