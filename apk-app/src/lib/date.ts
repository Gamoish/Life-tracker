/**
 * Every date-keyed module stores a plain `YYYY-MM-DD` string. Unlike the web
 * app (a server resolving "today" for everyone in one fixed APP_TIMEZONE),
 * this app runs entirely on one device — so "today" is always the device's
 * own local clock. There is no timezone parameter to override it: whatever
 * the phone thinks the date is, is the date.
 */

/** `YYYY-MM-DD` for the given instant, in the device's local timezone. */
export function toISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return toISODate(new Date());
}

/** Shift a `YYYY-MM-DD` string by whole days. Pure string/UTC math, no tz drift. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** ISO weekday for a `YYYY-MM-DD`: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return dow === 0 ? 7 : dow;
}

/**
 * e.g. "Sat, 15 Aug"
 *
 * Formatted in UTC deliberately, NOT the device's local zone: the input is
 * already a calendar date with no time component, so applying a zone could
 * only shift it to the wrong day.
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
