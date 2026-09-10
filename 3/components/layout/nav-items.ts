import {
  Activity,
  BellRing,
  CalendarCheck,
  Gamepad2,
  Gauge,
  Heart,
  Home,
  LayoutDashboard,
  LineChart,
  Settings,
  Sparkles,
  TriangleAlert,
  UserRound,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n';

export interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  /** Matched by the companion when it points at a control. */
  companionTarget?: string;
  /** Shown in the mobile bottom bar (max four plus "More"). */
  primary?: boolean;
}

export const PATIENT_NAV: NavItem[] = [
  { href: '/app', labelKey: 'nav.home', icon: Home, companionTarget: 'nav-home', primary: true },
  { href: '/app/games', labelKey: 'nav.games', icon: Gamepad2, companionTarget: 'nav-games', primary: true },
  { href: '/app/my-day', labelKey: 'nav.myDay', icon: CalendarCheck, companionTarget: 'nav-my-day', primary: true },
  { href: '/app/reminders', labelKey: 'nav.reminders', icon: BellRing, companionTarget: 'nav-reminders', primary: true },
  { href: '/app/planner', labelKey: 'nav.planner', icon: Sparkles, companionTarget: 'nav-planner' },
  { href: '/app/progress', labelKey: 'nav.progress', icon: LineChart, companionTarget: 'nav-progress' },
  { href: '/app/care-circle', labelKey: 'nav.careCircle', icon: Users, companionTarget: 'nav-care-circle' },
  { href: '/app/settings', labelKey: 'nav.settings', icon: Settings, companionTarget: 'nav-settings' },
];

export const CAREGIVER_NAV: NavItem[] = [
  { href: '/care', labelKey: 'nav.dashboard', icon: LayoutDashboard, primary: true },
  { href: '/care/activity', labelKey: 'nav.activity', icon: Activity, primary: true },
  { href: '/care/progress', labelKey: 'nav.progress', icon: LineChart, primary: true },
  { href: '/care/insights', labelKey: 'nav.insights', icon: Sparkles },
  { href: '/care/performance', labelKey: 'nav.performance', icon: Gauge },
  { href: '/care/alerts', labelKey: 'nav.alerts', icon: TriangleAlert, primary: true },
  { href: '/care/reminders', labelKey: 'nav.reminders', icon: BellRing },
  { href: '/care/patients', labelKey: 'nav.patients', icon: UsersRound },
  { href: '/care/profile', labelKey: 'nav.patientProfile', icon: UserRound },
  { href: '/care/family', labelKey: 'nav.family', icon: Users },
  { href: '/care/circle', labelKey: 'nav.careCircle', icon: Heart },
  { href: '/care/settings', labelKey: 'nav.settings', icon: Settings },
];

/** Longest-prefix match so nested game routes still light up "Games". */
export function isActivePath(pathname: string, href: string, items: NavItem[]): boolean {
  const best = items
    .map((item) => item.href)
    .filter((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`))
    .sort((a, b) => b.length - a.length)[0];
  return best === href;
}
