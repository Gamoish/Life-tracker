"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { habitLogs, habits } from "@/db/schema";
import { today } from "@/lib/date";
import { isHabitColor } from "./habit-color";

export type FormState = { error?: string; ok?: boolean };

function revalidateAll() {
  revalidatePath("/habits");
  revalidatePath("/"); // Today embeds the check-off list.
}

/**
 * Toggle a habit for a given day.
 *
 * A single INSERT ... ON CONFLICT DO UPDATE against the unique
 * (habit_id, date) key — never read-then-write. A double tap therefore yields
 * exactly one row and two well-defined flips, instead of racing to insert two
 * rows or losing one of the toggles.
 *
 * In the SET clause `habit_logs.done` refers to the EXISTING row (not the
 * proposed one, which would be `excluded.done`), so this negates what's stored.
 */
export async function toggleHabit(habitId: number, date?: string) {
  const day = date ?? today();

  await db
    .insert(habitLogs)
    .values({ habitId, date: day, done: true })
    .onConflictDoUpdate({
      target: [habitLogs.habitId, habitLogs.date],
      set: { done: sql`not ${habitLogs.done}` },
    });

  revalidateAll();
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
  revalidateAll();
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

  revalidateAll();
  return { ok: true };
}

/** Archiving keeps all history — it only drops the habit off the check-off list. */
export async function setHabitActive(id: number, active: boolean) {
  await db.update(habits).set({ active }).where(eq(habits.id, id));
  revalidateAll();
}

/** Permanently remove a habit. Its completion logs cascade with it in the database. */
export async function deleteHabit(id: number) {
  if (!Number.isInteger(id) || id < 1) return;

  await db.delete(habits).where(eq(habits.id, id));
  revalidateAll();
}
