import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { habitLogs, habits } from "@/db/schema";
import type { HabitColor } from "./habit-color";

/**
 * The single DB path for habits + their done-dates, shared by `/habits` and
 * the Today dashboard so "is this habit due today" can never drift between
 * the two — both filter the same rows through the same `isScheduledDay` rule.
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
    // Only `done` logs matter for streaks; an un-done row is the same as no row.
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
    color: h.color,
    active: h.active,
    doneDates: datesByHabit.get(h.id) ?? [],
  }));
}
