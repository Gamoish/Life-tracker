"use client";

import { useState } from "react";
import { HABIT_COLOR_BG, type HabitColor } from "./habit-color";

/** Index 0 = ISO weekday 1 (Monday) ... index 6 = ISO weekday 7 (Sunday). */
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "Daily" for all seven days, otherwise the picked days in week order. */
export function formatScheduledDays(days: readonly number[]): string {
  const set = new Set(days);
  if (set.size === 7) return "Daily";
  return [...set]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d - 1])
    .join(", ");
}

/**
 * A habit's schedule at a glance — seven small cells, Mon–Sun, lit for the
 * days it's due. Read-only decoration (the real control is `DayPicker`,
 * below), so a check-off card or a managed-habit row can show its rhythm
 * without a trip to the edit form.
 */
export function WeekdayDots({
  scheduledDays,
  color = "accent",
  today,
  className = "",
}: {
  scheduledDays: readonly number[];
  /** The habit's own identity color — lights the "on" cells instead of accent. */
  color?: HabitColor;
  /** ISO weekday (1–7) to ring as "today" — omit to skip the ring. */
  today?: number;
  className?: string;
}) {
  const set = new Set(scheduledDays);
  return (
    <div aria-hidden className={`flex gap-1 ${className}`}>
      {WEEKDAY_LABELS.map((label, i) => {
        const day = i + 1;
        const on = set.has(day);
        return (
          <span
            key={day}
            title={label}
            className={`flex h-4 w-4 items-center justify-center rounded-[4px] font-mono text-[0.5rem] font-semibold leading-none transition-colors ${
              on ? `${HABIT_COLOR_BG[color]} text-canvas` : "bg-raised text-faint"
            } ${today === day ? "ring-1 ring-inset ring-ink/70" : ""}`}
          >
            {label[0]}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Seven toggles, Mon–Sun, submitting as `scheduledDays` checkboxes (ISO
 * weekday values 1–7) so a native form action reads them straight off
 * `formData.getAll("scheduledDays")` — no client-side serialization needed.
 */
export default function DayPicker({
  name = "scheduledDays",
  defaultValue,
  ariaLabel = "Scheduled days",
}: {
  name?: string;
  defaultValue: readonly number[];
  ariaLabel?: string;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set(defaultValue));

  function toggle(day: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {WEEKDAY_LABELS.map((label, i) => {
        const day = i + 1;
        const on = selected.has(day);
        return (
          <label
            key={day}
            className={`flex h-9 w-11 cursor-pointer items-center justify-center rounded-lg border font-mono text-2xs font-semibold transition-colors ${
              on
                ? "border-accent bg-accent text-accent-ink"
                : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            <input
              type="checkbox"
              name={name}
              value={day}
              checked={on}
              onChange={() => toggle(day)}
              className="sr-only"
              data-testid={`day-${day}`}
            />
            {label}
          </label>
        );
      })}
    </div>
  );
}
