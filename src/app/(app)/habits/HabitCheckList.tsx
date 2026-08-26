"use client";

import { startTransition, useOptimistic } from "react";
import { CheckMark, EmptyState } from "@/components/ui";
import { IconAdd, IconFlame } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { isoWeekday } from "@/lib/date";
import { summarize } from "@/lib/habit-streak";
import { toggleHabit } from "./actions";
import { WeekdayDots } from "./DayPicker";
import { HABIT_COLOR_BG, HABIT_COLOR_GLOW, HABIT_COLOR_TEXT, type HabitColor } from "./habit-color";

export type HabitNode = {
  id: number;
  name: string;
  scheduledDays: number[];
  color: HabitColor;
  /** Dates (YYYY-MM-DD) this habit was logged done. */
  doneDates: string[];
};

/**
 * The daily check-off list.
 *
 * Deliberately self-contained — it takes its data and `today` as props and owns
 * nothing else — so the Today dashboard can embed it verbatim. Callers pass
 * every active habit; this filters down to the ones actually SCHEDULED today,
 * so a habit that isn't due never shows up here asking to be checked off (it's
 * still visible and manageable under Manage, below).
 */
export default function HabitCheckList({
  habits,
  today,
  emptyMessage = "No habits scheduled today",
}: {
  habits: HabitNode[];
  today: string;
  emptyMessage?: string;
}) {
  // Optimistic toggle. Streaks are recomputed with the same pure `summarize`
  // the server uses, so the badge can't show a number the server would reject.
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
  const toast = useToast();

  const due = optimistic
    .map((habit) => ({ habit, summary: summarize(habit, habit.doneDates, today) }))
    .filter(({ summary }) => summary.dueToday);

  if (due.length === 0) {
    return (
      <EmptyState
        icon={<IconAdd />}
        title={emptyMessage}
        hint="Nothing on the schedule for today."
      />
    );
  }

  const todayWeekday = isoWeekday(today);

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {due.map(({ habit, summary }) => (
        <li key={habit.id} className="h-full">
          <button
            type="button"
            data-testid="habit-row"
            data-name={habit.name}
            data-done={summary.doneToday ? "true" : "false"}
            data-streak={summary.streak}
            data-color={habit.color}
            aria-pressed={summary.doneToday}
            onClick={() => {
              if (!summary.doneToday) toast(`${habit.name} · checked off`, "done");
              startTransition(async () => {
                toggleLocally(habit.id);
                await toggleHabit(habit.id);
              });
            }}
            className={`flex h-full w-full items-center gap-3 rounded-card border px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 ${HABIT_COLOR_GLOW[habit.color]} ${
              summary.doneToday
                ? "border-done/30 bg-done-soft"
                : "border-line bg-surface hover:border-line-strong hover:bg-raised"
            }`}
          >
            <span
              key={summary.doneToday ? "done" : "undone"}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                summary.doneToday
                  ? "pop-in scale-100 border-done bg-done text-canvas shadow-[0_0_12px_-1px_rgba(84,203,126,0.65)]"
                  : "scale-90 border-line-strong text-transparent"
              }`}
            >
              <CheckMark className="h-3 w-3" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${HABIT_COLOR_BG[habit.color]}`}
                />
                <span
                  className={`truncate text-sm ${
                    summary.doneToday ? "text-faint line-through" : ""
                  }`}
                >
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

            {/* The per-habit streak, made prominent — a number, not a chip,
                colored to the habit's own identity rather than a flat accent. */}
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
                <span className="mt-0.5 text-[0.6rem] uppercase tracking-wide text-faint">
                  day streak
                </span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
