"use client";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { habitLogs, habits } from "@/db/schema";
import { today } from "@/lib/date";
import { isHabitColor } from "@/lib/habit-color";

/**
 * Plain async client functions — the direct equivalent of the web app's
 * `"use server"` actions in `src/app/(app)/habits/actions.ts`, minus the
 * server: no `"use server"`, no `revalidatePath` (there's no server render
 * to invalidate; callers just re-run `listHabitsWithLogs` after a mutation
 * the same way the UI here already refetches on every change), and the DB
 * calls target the SQLite schema instead of Postgres. The upsert/toggle
 * logic itself — INSERT ... ON CONFLICT DO UPDATE, never read-then-write —
 * is unchanged.
 */

export type FormState = { error?: string; ok?: boolean };

/**
 * Toggle a habit for a given day.
 *
 * A single INSERT ... ON CONFLICT DO UPDATE against the unique
 * (habit_id, date) key. In the SET clause `habit_logs.done` refers to the
 * EXISTING row (not the proposed one), so this negates what's stored.
 */
export async function toggleHabit(habitId: number, date?: string): Promise<void> {
  const day = date ?? today();

  await db
    .insert(habitLogs)
    .values({ habitId, date: day, done: true })
    .onConflictDoUpdate({
      target: [habitLogs.habitId, habitLogs.date],
      set: { done: sql`not ${habitLogs.done}` },
    });
}

/** `1..7`, deduped and sorted — the order it's stored and rendered in. */
function parseScheduledDays(formData: FormData): { value?: number[]; error?: string } {
  const raw = formData.getAll("scheduledDays").map(Number);
  const days = [...new Set(raw.filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))].sort(
    (a, b) => a - b,
  );

  if (days.length === 0) return { error: "Pick at least one day" };
  return { value: days };
}

function parseColor(formData: FormData) {
  const raw = String(formData.get("color") ?? "accent");
  return isHabitColor(raw) ? raw : "accent";
}

export async function addHabit(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };

  const days = parseScheduledDays(formData);
  if (days.error) return { error: days.error };

  await db.insert(habits).values({ name, scheduledDays: days.value!, color: parseColor(formData) });
  return { ok: true };
}

export async function updateHabit(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!Number.isFinite(id)) return { error: "Missing habit" };
  if (!name) return { error: "Name is required" };

  const days = parseScheduledDays(formData);
  if (days.error) return { error: days.error };

  await db
    .update(habits)
    .set({ name, scheduledDays: days.value!, color: parseColor(formData) })
    .where(eq(habits.id, id));

  return { ok: true };
}

/** Archiving keeps all history — it only drops the habit off the check-off list. */
export async function setHabitActive(id: number, active: boolean): Promise<void> {
  await db.update(habits).set({ active }).where(eq(habits.id, id));
}

/** Permanently remove a habit. Its completion logs cascade with it in SQLite (FK ON DELETE CASCADE). */
export async function deleteHabit(id: number): Promise<void> {
  if (!Number.isInteger(id) || id < 1) return;
  await db.delete(habits).where(eq(habits.id, id));
}
