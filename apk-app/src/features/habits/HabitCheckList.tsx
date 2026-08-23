"use client";

import { startTransition, useOptimistic } from "react";
import { IconAdd, IconFlame } from "@/components/icons";
import { CheckMark, EmptyState } from "@/components/ui";
import { isoWeekday } from "@/lib/date";
import { HABIT_COLOR_BG, HABIT_COLOR_GLOW, HABIT_COLOR_TEXT, type HabitColor } from "@/lib/habit-color";
import { summarize } from "@/lib/habit-streak";
import { toggleHabit } from "./actions";
import { WeekdayDots } from "./DayPicker";

export type HabitNode = {
  id: number;
  name: string;
  scheduledDays: number[];
  color: HabitColor;
  /** Dates (YYYY-MM-DD) this habit was logged done. */
  doneDates: string[];
};

/**
 * The daily check-off list. Ported from the web app's `HabitCheckList.tsx`
 * almost unchanged — same optimistic-update shape, same pure `summarize`
 * driving the streak badge. The only real difference is that `toggleHabit`
 * here writes straight to the on-device SQLite DB instead of a server
 * action, and `onChanged` (a plain refetch callback from the parent, since
 * there's no `revalidatePath` to lean on) replaces Next's revalidation.
 */
export default function HabitCheckList({
  habits,
  today,
  onChanged,
  emptyMessage = "No habits scheduled today",
}: {
  habits: HabitNode[];
  today: string;
  onChanged: () => void;
  emptyMessage?: string;
}) {
  const [optimistic, toggleLocally] = useOptimistic(
    habits,
    (state: HabitNode[], id: number) =>
      state.map((h) =>
        h.id === id
          ? {
              ...h,
              doneDates: h.doneDates.includes(today)
                ? h.doneDates.filter((d) => d !== today)
                : [...h.doneDates, today],
            }
          : h,
      ),
  );

  const due = optimistic
    .map((habit) => ({ habit, summary: summarize(habit, habit.doneDates, today) }))
    .filter(({ summary }) => summary.dueToday);

  if (due.length === 0) {
    return (
      <EmptyState icon={<IconAdd />} title={emptyMessage} hint="Nothing on the schedule for today." />
    );
  }

  const todayWeekday = isoWeekday(today);

  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {due.map(({ habit, summary }) => (
        <li key={habit.id} className="h-full">
          <button
            type="button"
            aria-pressed={summary.doneToday}
            onClick={() =>
              startTransition(async () => {
                toggleLocally(habit.id);
                await toggleHabit(habit.id);
                onChanged();
              })
            }
            className={`flex h-full w-full items-center gap-3 rounded-card border px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 ${HABIT_COLOR_GLOW[habit.color]} ${
              summary.doneToday
                ? "border-done/30 bg-done-soft"
                : "border-line bg-surface hover:border-line-strong hover:bg-raised"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                summary.doneToday
                  ? "scale-100 border-done bg-done text-canvas shadow-[0_0_12px_-1px_rgba(84,203,126,0.65)]"
                  : "scale-90 border-line-strong text-transparent"
              }`}
            >
              <CheckMark className="h-3 w-3" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${HABIT_COLOR_BG[habit.color]}`} />
                <span className={`truncate text-sm ${summary.doneToday ? "text-faint line-through" : ""}`}>
                  {habit.name}
                </span>
              </span>
              <WeekdayDots
                scheduledDays={habit.scheduledDays}
                color={habit.color}
                today={todayWeekday}
                className="mt-1.5"
              />
            </span>

            <span className="flex shrink-0 items-center gap-1.5">
              <IconFlame
                className={`h-4 w-4 ${summary.streak > 0 ? HABIT_COLOR_TEXT[habit.color] : "text-faint"}`}
              />
              <span className="flex flex-col items-end leading-none">
                <span
                  className={`font-mono text-xl font-bold tabular-nums ${
                    summary.streak > 0 ? HABIT_COLOR_TEXT[habit.color] : "text-faint"
                  }`}
                >
                  {summary.streak}
                </span>
                <span className="mt-0.5 text-[0.6rem] uppercase tracking-wide text-faint">day streak</span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
