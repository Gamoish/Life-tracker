/**
 * Sleep duration maths. Pure and DB-free, same spirit as every other `lib`
 * file here — takes plain "HH:MM" strings, returns a number, testable in
 * isolation.
 *
 * Bed time and wake time are logged as clock times only (no date), so a
 * wake time that's numerically "earlier" than bed time (23:00 -> 07:00) is
 * assumed to mean "the next morning" — the ordinary case for anyone sleeping
 * through midnight. A wake time later in the same clock (e.g. a 14:00 bed
 * time and a 15:00 wake time, an afternoon nap) is read literally, same day.
 */

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes between `bedTime` and `wakeTime`, both "HH:MM", wrapping past midnight when needed. */
export function computeSleepDuration(bedTime: string, wakeTime: string): number {
  const bed = toMinutes(bedTime);
  const wake = toMinutes(wakeTime);
  return wake > bed ? wake - bed : 24 * 60 - bed + wake;
}

/** "7h 30m" / "7h" / "45m" — never "0h 0m" for a same-instant edge case (that's a full 24h asleep). */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
