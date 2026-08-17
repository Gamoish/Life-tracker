import { addDays, isoWeekday } from "./date";

/**
 * Habit streak maths, for the weekday-scheduled habit model.
 *
 * A habit carries a set of scheduled weekdays (`1 = Monday ... 7 = Sunday`,
 * matching `isoWeekday` in `./date`). "Daily" is just all seven days selected;
 * "3 days a week" is any three — there is no separate cadence branch, the
 * schedule set is the only input that varies.
 *
 * Streak rule: a streak counts consecutive SCHEDULED days only. A day that
 * isn't scheduled for this habit is skipped silently — it neither breaks nor
 * extends the streak. Only a missed *scheduled* day breaks it.
 *
 * Pure and DB-free, operating only on `YYYY-MM-DD` strings, so it can be unit
 * tested in isolation and re-run client-side for optimistic toggles with
 * exactly the same result the server would produce.
 *
 * IMPORTANT: `today` is always passed in. Callers resolve it with
 * `today()` from `./date`, which uses APP_TIMEZONE (Asia/Kolkata) — never the
 * client's local clock, or a late-evening tap would land on the wrong day.
 */

export type HabitSummary = {
  doneToday: boolean;
  /** Whether today is one of this habit's scheduled weekdays. */
  dueToday: boolean;
  streak: number;
  longest: number;
};

function asSet(dates: Iterable<string>): Set<string> {
  return dates instanceof Set ? dates : new Set(dates);
}

/** Whether `date` falls on one of `scheduledDays` (ISO weekdays, 1 = Mon). */
export function isScheduledDay(scheduledDays: readonly number[], date: string): boolean {
  return scheduledDays.includes(isoWeekday(date));
}

/**
 * Consecutive done SCHEDULED days ending today (or yesterday).
 *
 * An unchecked TODAY does not break the streak when today is scheduled — the
 * day isn't over yet, so counting starts from yesterday instead. A day that
 * isn't scheduled is skipped over without being examined for done-ness at all.
 * Only a scheduled day that was missed ends the run.
 */
export function currentStreak(
  scheduledDays: readonly number[],
  doneDates: Iterable<string>,
  today: string,
): number {
  if (scheduledDays.length === 0) return 0;
  const done = asSet(doneDates);

  let cursor = today;
  if (isScheduledDay(scheduledDays, cursor) && !done.has(cursor)) {
    cursor = addDays(cursor, -1);
  }

  let count = 0;
  while (true) {
    if (!isScheduledDay(scheduledDays, cursor)) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!done.has(cursor)) break;
    count += 1;
    cursor = addDays(cursor, -1);
  }

  return count;
}

/**
 * Longest run of consecutive done SCHEDULED days anywhere in the history.
 *
 * Walks every calendar day between the earliest and latest done date (not just
 * the done dates themselves) so a missed scheduled day in the middle of that
 * span is counted as a break even though it has no log row of its own.
 * Non-scheduled days in the span are skipped without affecting the run.
 */
export function longestStreak(
  scheduledDays: readonly number[],
  doneDates: Iterable<string>,
): number {
  if (scheduledDays.length === 0) return 0;
  const done = asSet(doneDates);
  if (done.size === 0) return 0;

  const sorted = [...done].sort(); // ISO dates sort lexicographically
  const end = sorted[sorted.length - 1];

  let cursor = sorted[0];
  let run = 0;
  let best = 0;

  while (cursor <= end) {
    if (isScheduledDay(scheduledDays, cursor)) {
      run = done.has(cursor) ? run + 1 : 0;
      if (run > best) best = run;
    }
    cursor = addDays(cursor, 1);
  }

  return best;
}

/** One call the UI uses for a habit's check-off state and streak numbers. */
export function summarize(
  habit: { scheduledDays: readonly number[] },
  doneDates: Iterable<string>,
  today: string,
): HabitSummary {
  const done = asSet(doneDates);

  return {
    doneToday: done.has(today),
    dueToday: isScheduledDay(habit.scheduledDays, today),
    streak: currentStreak(habit.scheduledDays, done, today),
    longest: longestStreak(habit.scheduledDays, done),
  };
}
