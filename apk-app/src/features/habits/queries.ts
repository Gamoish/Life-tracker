import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { habitLogs, habits } from "@/db/schema";
import type { HabitColor } from "@/lib/habit-color";

/**
 * The single DB path for habits + their done-dates. Ported from the web
 * app's `queries.ts` — same shape, same "only `done` logs matter for
 * streaks" rule — just a plain async function instead of a server-only
 * module, since there's no server here to keep it on.
 */

export type HabitWithLogs = {
  id: number;
  name: string;
  scheduledDays: number[];
  color: HabitColor;
  active: boolean;
  doneDates: string[];
};

export async function listHabitsWithLogs(): Promise<HabitWithLogs[]> {
  const [habitRows, logRows] = await Promise.all([
    db.select().from(habits).orderBy(asc(habits.id)),
    db
      .select({ habitId: habitLogs.habitId, date: habitLogs.date })
      .from(habitLogs)
      .where(eq(habitLogs.done, true)),
  ]);

  const datesByHabit = new Map<number, string[]>();
  for (const log of logRows) {
    const bucket = datesByHabit.get(log.habitId);
    if (bucket) bucket.push(log.date);
    else datesByHabit.set(log.habitId, [log.date]);
  }

  return habitRows.map((h) => ({
    id: h.id,
    name: h.name,
    scheduledDays: h.scheduledDays,
    color: h.color as HabitColor,
    active: h.active,
    doneDates: datesByHabit.get(h.id) ?? [],
  }));
}
