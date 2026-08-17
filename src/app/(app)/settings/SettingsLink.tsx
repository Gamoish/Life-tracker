"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive } from "@/components/nav-items";

/**
 * A gear icon, not an 8th `DESTINATIONS` entry — Settings is a utility you
 * reach for occasionally, not a place you live in, so it gets the same
 * "icon next to the logo/bell, not a row in the tab bar" treatment as
 * `TaskBell` rather than crowding the bottom nav further.
 *
 * Rendered twice (Sidebar, BottomNav) for the same reason `TaskBell` is —
 * each breakpoint gets its own natural position from the same one component.
 */
export default function SettingsLink({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const active = isActive(pathname, "/settings");

  return (
    <Link
      href="/settings"
      aria-label="Settings"
      aria-current={active ? "page" : undefined}
      data-testid="settings-link"
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V19a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H4a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H10a1.65 1.65 0 0 0 1-1.51V4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10a1.65 1.65 0 0 0 1.51 1H20a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </svg>
    </Link>
  );
}
