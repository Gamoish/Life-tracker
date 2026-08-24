/**
 * One source of truth for where you can go, shared by the desktop sidebar and
 * the mobile tab bar so the two can never drift apart.
 *
 * No hooks in here, so both a server component (Sidebar) and a client component
 * (BottomNav) can import it.
 */

export type Destination = {
  href: string;
  label: string;
  icon: () => React.ReactElement;
};

/** The full destination list — desktop sidebar order, unchanged by the mobile nav cleanup below. */
export const DESTINATIONS: Destination[] = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/habits", label: "Habits", icon: IconRepeat },
  { href: "/goals", label: "Goals", icon: IconTarget },
  { href: "/roadmaps", label: "Roadmaps", icon: IconRoadmap },
  { href: "/health", label: "Health", icon: IconHeart },
  { href: "/tasks", label: "Tasks", icon: IconTasks },
  { href: "/expenses", label: "Expenses", icon: IconExpense },
  { href: "/journal", label: "Journal", icon: IconJournal },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

/**
 * Mobile bottom bar, split into the tier tapped daily (rendered directly) and
 * everything else (behind the "More" sheet) — the full 9-item `DESTINATIONS`
 * list is too cramped for one row at phone widths.
 */
export const MOBILE_PRIMARY: Destination[] = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/tasks", label: "Tasks", icon: IconTasks },
  { href: "/habits", label: "Habits", icon: IconRepeat },
  { href: "/expenses", label: "Expenses", icon: IconExpense },
];

export const MOBILE_MORE: Destination[] = [
  { href: "/health", label: "Health", icon: IconHeart },
  { href: "/goals", label: "Goals", icon: IconTarget },
  { href: "/roadmaps", label: "Roadmaps", icon: IconRoadmap },
  { href: "/journal", label: "Journal", icon: IconJournal },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

/** `/` only matches itself; everything else matches its subtree. */
export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/* Inline icons — avoids pulling an icon package in for six glyphs. */

const svg = {
  className: "h-5 w-5",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconHome() {
  return (
    <svg {...svg}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function IconRoadmap() {
  return (
    <svg {...svg}>
      <path d="M4 6h9a3 3 0 0 1 0 6H8a3 3 0 0 0 0 6h9" />
      <circle cx="4" cy="6" r="1.6" />
      <circle cx="20" cy="18" r="1.6" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function IconRepeat() {
  return (
    <svg {...svg}>
      <path d="M4 9a4 4 0 0 1 4-4h9M17 3l3 2.6L17 8" />
      <path d="M20 15a4 4 0 0 1-4 4H7M7 21l-3-2.6L7 16" />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg {...svg}>
      <path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20Z" />
    </svg>
  );
}

function IconTasks() {
  return (
    <svg {...svg}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

function IconExpense() {
  return (
    <svg {...svg}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="17" cy="14.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

function IconJournal() {
  return (
    <svg {...svg}>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H18a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 18 21H6.5A1.5 1.5 0 0 1 5 19.5v-15Z" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10a1.65 1.65 0 0 0 1.51 1H20a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

/** Three dots — the "More" trigger in the mobile bottom bar. */
export function IconMore() {
  return (
    <svg {...svg}>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
