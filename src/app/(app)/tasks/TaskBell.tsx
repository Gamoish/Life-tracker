"use client";

import Link from "next/link";
import { useState } from "react";
import { EmptyState, Pill } from "@/components/ui";
import type { DueTaskSummary } from "./queries";

/**
 * The nav bell — due-today + overdue tasks, at a glance, without leaving
 * whatever page you're on. In-app only, no push/service-worker: the count is
 * resolved server-side in `AppLayout` and refreshes the same way every other
 * live number in this app does, on navigation or after an action revalidates
 * the route. There's no background polling here — see the design-decision
 * note in the PR/report for why.
 *
 * Rendered twice (once in `Sidebar`, once in `MobileTopBar`) so each
 * breakpoint gets its own natural position — the same "same data, two
 * chrome-specific renderings" pattern `DESTINATIONS` already uses. Both
 * chromes sit near the TOP of the screen now, so the panel always opens
 * downward — it used to also render inside the bottom tab bar, where it had
 * to open upward instead, but that placement moved to `MobileTopBar`.
 */
export default function TaskBell({
  items,
  className = "",
  placement = "default",
}: {
  items: DueTaskSummary[];
  className?: string;
  /** The sidebar is narrower than the standard notification tray. */
  placement?: "default" | "sidebar";
}) {
  const [open, setOpen] = useState(false);
  const overdueCount = items.filter((t) => t.overdue).length;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-label={`Due tasks: ${items.length}`}
        aria-expanded={open}
        data-testid="task-bell"
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          open
            ? "border-accent bg-accent-soft text-accent"
            : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 0 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 12.5 6 8Z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {items.length > 0 && (
          <span
            data-testid="task-bell-count"
            className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[0.6rem] font-bold tabular-nums text-canvas ${
              overdueCount > 0 ? "bg-warn" : "bg-accent"
            }`}
          >
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-away layer — covers the viewport so any outside tap closes the panel. */}
          <button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            data-testid="task-bell-panel"
            className={`absolute right-0 top-full z-40 mt-2 max-w-[calc(100vw-2rem)] rounded-card border border-line bg-gradient-to-b from-raised/80 to-surface p-3 shadow-[0_20px_44px_-20px_rgba(0,0,0,0.7)] ${
              placement === "sidebar"
                ? "w-[calc(15rem-2.5rem)] lg:w-[calc(16rem-2.5rem)]"
                : "w-80"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-sm font-semibold tracking-tight">Due &amp; overdue</p>
              <Link
                href="/tasks"
                onClick={() => setOpen(false)}
                className="text-2xs text-accent underline underline-offset-4"
              >
                Open Tasks →
              </Link>
            </div>

            {items.length === 0 ? (
              <EmptyState title="Nothing due" hint="You're caught up." className="py-6" />
            ) : (
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
                {items.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-raised px-2.5 py-1.5"
                  >
                    <span className="min-w-0 truncate text-sm">{t.title}</span>
                    {t.overdue && (
                      <Pill tone="warn" className="shrink-0">
                        Overdue
                      </Pill>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
