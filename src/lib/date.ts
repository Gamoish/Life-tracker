/**
 * Every date-keyed module stores a plain `YYYY-MM-DD` string, so "today" has to
 * be resolved in *your* timezone rather than the server's UTC clock — otherwise
 * a log written at 11pm lands on the wrong day.
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "UTC";

/** `YYYY-MM-DD` for the given instant in APP_TIMEZONE. */
export function toISODate(d: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function today(timeZone: string = APP_TIMEZONE): string {
  return toISODate(new Date(), timeZone);
}

/** Hour of day (0–23) in APP_TIMEZONE — for anything that only cares about time-of-day, like a greeting. */
export function currentHour(timeZone: string = APP_TIMEZONE): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(
      new Date(),
    ),
  );
}

/** Shift a `YYYY-MM-DD` string by whole days. Pure string/UTC math, no tz drift. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Monday-start week containing `isoDate`, as [start, end] inclusive. */
export function weekBounds(isoDate: string): [string, string] {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  const backToMonday = (dow + 6) % 7;
  const start = addDays(isoDate, -backToMonday);
  return [start, addDays(start, 6)];
}

/** ISO weekday for a `YYYY-MM-DD`: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return dow === 0 ? 7 : dow;
}

/** Number of days in `year`-`month` (`month` is 1–12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate(); // day 0 of next month
}

/** Calendar month containing `isoDate`, as [start, end] inclusive. */
export function monthBounds(isoDate: string): [string, string] {
  const [y, m] = isoDate.split("-").map(Number);
  const mm = String(m).padStart(2, "0");
  const last = String(daysInMonth(y, m)).padStart(2, "0");
  return [`${y}-${mm}-01`, `${y}-${mm}-${last}`];
}

/** Calendar year containing `isoDate`, as [start, end] inclusive. */
export function yearBounds(isoDate: string): [string, string] {
  const y = isoDate.slice(0, 4);
  return [`${y}-01-01`, `${y}-12-31`];
}

export function isBefore(a: string, b: string): boolean {
  return a < b; // ISO dates sort lexicographically
}

/**
 * e.g. "Sat, 15 Aug"
 *
 * Formatted in UTC deliberately, NOT in APP_TIMEZONE: the input is already a
 * calendar date with no time component, so applying a zone could only shift it
 * to the wrong day. It also keeps this safe to call from client components,
 * where `process.env.APP_TIMEZONE` isn't available and would silently differ
 * from the server's rendering.
 */
export function formatShort(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
