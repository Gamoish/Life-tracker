import { addDays, daysInMonth, isoWeekday } from "./date";

/**
 * Task due-date maths, for the recurrence model described in
 * `src/db/schema.ts` (see the `tasks.dueDate` comment for what the anchor
 * means per recurrence type).
 *
 * Pure and DB-free, same spirit as `habit-streak.ts`: it takes plain rows and
 * date strings and returns booleans, so it's unit-testable in isolation and
 * safe to re-run client-side for optimistic UI without a round-trip.
 *
 * Recurring tasks are never mutated on completion — "done today" and "next
 * due" both fall out of this file's pure functions applied to today's date,
 * the same way a habit's streak never stores a "next due day" pointer either.
 * Only ONE_OFF tasks carry their own terminal state (`completedAt` on the row
 * itself); recurring tasks are completed via a `task_completions` log, kept
 * entirely outside this file (it doesn't know about completions at all,
 * except where `isOverdue` needs to check one is missing).
 */

export type TaskRecurrence = "one_off" | "daily" | "weekly" | "monthly" | "yearly";

export type TaskSchedule = {
  recurrence: TaskRecurrence;
  /** YYYY-MM-DD anchor — see the schema comment for what it means per type. */
  dueDate: string;
  /** ISO weekdays 1–7 — only read when recurrence is 'weekly'. */
  scheduledDays: readonly number[] | null;
};

/** The day-of-month `anchor` recurs on in `date`'s month, clamped to that month's length. */
function monthlyMatch(date: string, anchor: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const anchorDay = Number(anchor.split("-")[2]);
  const effectiveDay = Math.min(anchorDay, daysInMonth(y, m));
  return d === effectiveDay;
}

/** The month+day `anchor` recurs on — Feb 29 clamps to Feb 28 outside leap years. */
function yearlyMatch(date: string, anchor: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const [, am, ad] = anchor.split("-").map(Number);
  if (am === 2 && ad === 29 && daysInMonth(y, 2) !== 29) {
    return m === 2 && d === 28;
  }
  return m === am && d === ad;
}

/**
 * Whether `date` is a day this task is due, per its recurrence rule. A task
 * is never due before its own anchor `dueDate` — that's the day it starts
 * existing, not just a hint for monthly/yearly math.
 */
export function isDueOn(task: TaskSchedule, date: string): boolean {
  if (date < task.dueDate) return false;

  switch (task.recurrence) {
    case "one_off":
      return date === task.dueDate;
    case "daily":
      return true;
    case "weekly":
      return (task.scheduledDays ?? []).includes(isoWeekday(date));
    case "monthly":
      return monthlyMatch(date, task.dueDate);
    case "yearly":
      return yearlyMatch(date, task.dueDate);
  }
}

/**
 * The most recent due date strictly before `today`, or null if the task has
 * no due occurrence before then (e.g. its anchor is today or later). Walks
 * backward one day at a time — bounded by the task's own anchor, so it can
 * never loop past where the task's history actually starts.
 */
export function previousDueDate(task: TaskSchedule, today: string): string | null {
  let cursor = addDays(today, -1);
  while (cursor >= task.dueDate) {
    if (isDueOn(task, cursor)) return cursor;
    cursor = addDays(cursor, -1);
  }
  return null;
}

/**
 * A RECURRING task is overdue when its most recent due occurrence before
 * today has no completion logged for that exact date. (One-off tasks don't
 * use this — their overdue-ness is just `!completedAt && dueDate < today`,
 * checked directly against the single `completedAt` column by the caller.)
 */
export function isOverdue(
  task: TaskSchedule,
  completedDates: Iterable<string>,
  today: string,
): boolean {
  if (task.recurrence === "one_off") return false;
  const prev = previousDueDate(task, today);
  if (prev === null) return false;
  const done = completedDates instanceof Set ? completedDates : new Set(completedDates);
  return !done.has(prev);
}
