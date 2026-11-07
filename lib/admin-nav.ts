import {
  Activity,
  BarChart3,
  Calendar,
  FileBarChart,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";

/**
 * The only source of admin destinations (FR-001).
 * `flag` items are hidden when the matching platform feature flag is off.
 */

export type AdminNavGroup =
  | "Overview"
  | "Audience"
  | "Events"
  | "Operations"
  | "Governance"
  | "Personal";

export type AdminFeatureFlag =
  | "commandPalette"
  | "reports"
  | "broadcasts"
  | "feedbackInbox"
  | "systemHealth";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: AdminNavGroup;
  flag?: AdminFeatureFlag;
  /** Short purpose line reused by the command palette and page copy. */
  description: string;
}

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  "Overview",
  "Audience",
  "Events",
  "Operations",
  "Governance",
  "Personal",
];

export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "Overview",
    description: "What changed and what needs attention today",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: BarChart3,
    group: "Overview",
    description: "Filtered demand, funnel, retention, and revenue",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    group: "Audience",
    description: "Accounts, roles, and bans",
  },
  {
    href: "/admin/feedback",
    label: "Feedback inbox",
    icon: MessageSquare,
    group: "Audience",
    flag: "feedbackInbox",
    description: "Bugs, requests, and abuse reports",
  },
  {
    href: "/admin/events",
    label: "Events",
    icon: Calendar,
    group: "Events",
    description: "Event oversight and deletion",
  },
  {
    href: "/admin/registrations",
    label: "Registrations",
    icon: Ticket,
    group: "Events",
    description: "Attendance and cancellations",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: FileBarChart,
    group: "Events",
    flag: "reports",
    description: "Per-event attendance and revenue reports",
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    icon: Megaphone,
    group: "Operations",
    flag: "broadcasts",
    description: "Email a filtered audience",
  },
  {
    href: "/admin/health",
    label: "System health",
    icon: HeartPulse,
    group: "Operations",
    flag: "systemHealth",
    description: "Cron, email, rate limits, and configuration",
  },
  {
    href: "/admin/invites",
    label: "Admin invites",
    icon: KeyRound,
    group: "Governance",
    description: "Invite and revoke administrators",
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    icon: Activity,
    group: "Governance",
    description: "Every administrative action",
  },
  {
    href: "/admin/platform",
    label: "Platform settings",
    icon: ShieldCheck,
    group: "Governance",
    description: "Defaults, feature flags, and maintenance mode",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    group: "Personal",
    description: "Your profile and notification preferences",
  },
];

/** True when the pathname is inside the item's route. */
export function isNavItemActive(href: string, pathname: string | null) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Items grouped in display order, optionally filtered by enabled flags. */
export function groupedNavItems(
  enabledFlags?: Partial<Record<AdminFeatureFlag, boolean>>
): { group: AdminNavGroup; items: AdminNavItem[] }[] {
  return ADMIN_NAV_GROUPS.map((group) => ({
    group,
    items: ADMIN_NAV.filter((item) => {
      if (item.group !== group) return false;
      if (item.flag && enabledFlags && enabledFlags[item.flag] === false) return false;
      return true;
    }),
  })).filter((entry) => entry.items.length > 0);
}

/** Page actions available to the palette when the query is empty. */
export const PALETTE_PAGE_ACTIONS: readonly AdminNavItem[] = ADMIN_NAV;
