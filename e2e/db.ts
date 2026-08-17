import { Client } from "pg";

/**
 * Direct DB access for the e2e suite.
 *
 * Needed for two things the UI genuinely cannot do:
 *   - seeding PAST habit_logs (the check-off list only ever toggles today), and
 *   - asserting row-level facts, e.g. that a double-tap produced exactly one row.
 *
 * A fresh client per call keeps no handles open, so Playwright exits cleanly.
 */
export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    await client.end();
  }
}

/** `YYYY-MM-DD` in the app's timezone — the same rule the server applies. */
export function istToday(offsetDays = 0): string {
  const now = new Date();
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE || "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  if (offsetDays === 0) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d));
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return shifted.toISOString().slice(0, 10);
}

/** ISO weekday for `YYYY-MM-DD`: 1 = Monday ... 7 = Sunday. Mirrors src/lib/date.ts. */
export function isoWeekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return dow === 0 ? 7 : dow;
}

/** Removes everything the suite created. Habit logs go with the cascade. */
export async function cleanup() {
  await sql("delete from habits where name like 'E2E %'");
}
