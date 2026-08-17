import { addDays, weekBounds } from "./date";

/**
 * Daily-consistency grid maths.
 *
 * Pure and DB-free, operating only on `YYYY-MM-DD` strings — the same shape and
 * the same rules as `habit-streak.ts`, so it unit-tests in isolation and can be
 * recomputed client-side without a round-trip.
 *
 * Callers hand in one date string PER EVENT (a habit check-off); repeats on
 * the same day stack into that day's count. The helper stays indifferent to
 * where events came from — it only ever sees flat date strings.
 *
 * IMPORTANT: `today` is always passed in, resolved by the caller with `today()`
 * from `./date` (APP_TIMEZONE) — never the client's local clock.
 */

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export type HeatDay = {
  date: string;
  count: number;
  level: HeatLevel;
};

/** One column. Always 7 slots, Monday first; `null` = outside the range. */
export type HeatWeek = {
  start: string;
  days: (HeatDay | null)[];
};

export type HeatMonth = {
  /** Index into `weeks` where this month's first column sits. */
  index: number;
  label: string;
};

export type Heatmap = {
  weeks: HeatWeek[];
  months: HeatMonth[];
  /** Monday of the first column. */
  start: string;
  /** The last rendered day — `today`, never a future date. */
  end: string;
  /** Events inside the window. Events outside it are ignored. */
  total: number;
  /** Days inside the window with at least one event. */
  activeDays: number;
  /** Highest single-day count in the window. */
  max: number;
  busiestDate: string | null;
};

/** Tally repeated date strings into per-day counts. */
export function countByDate(dates: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const date of dates) {
    if (!date) continue;
    const day = date.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

/**
 * Bucket a day's count onto the 0–4 ramp.
 *
 * The `max(max, 4)` floor is deliberate: without it a window whose busiest day
 * had a single event would paint every active day at full intensity, so a quiet
 * fortnight would look identical to a heroic one. With it, the ramp only
 * saturates once you're genuinely doing four-plus things in a day.
 */
export function heatLevel(count: number, max: number): HeatLevel {
  if (count <= 0) return 0;
  const scale = Math.max(max, 4);
  const level = Math.ceil((count / scale) * 4);
  return Math.min(4, Math.max(1, level)) as HeatLevel;
}

/** "Aug" for a `YYYY-MM-DD`. UTC, so it can't drift a day either way. */
function monthLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * Build the grid: `weeks` Monday-start columns ending with the week that
 * contains `today`. Days after `today` are `null` rather than empty cells — an
 * unlived day is not a missed one.
 */
export function buildHeatmap(
  dates: Iterable<string>,
  today: string,
  weeks = 26,
): Heatmap {
  const span = Math.max(1, Math.floor(weeks));
  const [currentMonday] = weekBounds(today);
  const start = addDays(currentMonday, -7 * (span - 1));

  const counts = countByDate(dates);

  // First pass: lay out the cells and find the window's peak.
  let total = 0;
  let activeDays = 0;
  let max = 0;
  let busiestDate: string | null = null;

  const grid: (HeatDay | null)[][] = [];
  for (let w = 0; w < span; w++) {
    const weekStart = addDays(start, w * 7);
    const column: (HeatDay | null)[] = [];

    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      if (date > today) {
        column.push(null);
        continue;
      }

      const count = counts.get(date) ?? 0;
      if (count > 0) {
        total += count;
        activeDays += 1;
        if (count > max) {
          max = count;
          busiestDate = date;
        }
      }
      column.push({ date, count, level: 0 });
    }
    grid.push(column);
  }

  // Second pass: levels are relative to the window's peak, so they can only be
  // assigned once every cell has been counted.
  const weeksOut: HeatWeek[] = grid.map((column, w) => ({
    start: addDays(start, w * 7),
    days: column.map((cell) =>
      cell === null ? null : { ...cell, level: heatLevel(cell.count, max) },
    ),
  }));

  return {
    weeks: weeksOut,
    months: monthMarkers(weeksOut),
    start,
    end: today,
    total,
    activeDays,
    max,
    busiestDate,
  };
}

/**
 * Where to print month names above the columns.
 *
 * A label is emitted on the column where the month changes, and suppressed if
 * it would land within one column of the previous one — two abbreviations
 * jammed together read as noise, not as an axis.
 */
function monthMarkers(weeks: HeatWeek[]): HeatMonth[] {
  const out: HeatMonth[] = [];
  let previousMonth = "";
  let lastIndex = -2;

  weeks.forEach((week, index) => {
    const month = week.start.slice(0, 7);
    if (month === previousMonth) return;
    previousMonth = month;

    if (index - lastIndex < 2) return;
    out.push({ index, label: monthLabel(week.start) });
    lastIndex = index;
  });

  return out;
}

/**
 * Consecutive days with at least one event, ending today or yesterday.
 *
 * Same "today isn't over yet" rule as `habit-streak.currentStreak` — an empty
 * today doesn't end the run, only a missed past day does.
 */
export function activityStreak(dates: Iterable<string>, today: string): number {
  const counts = countByDate(dates);

  let cursor = counts.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (counts.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}
