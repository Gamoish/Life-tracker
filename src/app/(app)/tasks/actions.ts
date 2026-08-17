"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { taskCompletions, tasks } from "@/db/schema";
import { today } from "@/lib/date";
import type { TaskRecurrence } from "@/lib/task-schedule";

export type FormState = { error?: string; ok?: boolean };

const RECURRENCES: TaskRecurrence[] = ["one_off", "daily", "weekly", "monthly", "yearly"];

function revalidateAll() {
  revalidatePath("/tasks");
  revalidatePath("/"); // Today's-due-count and (once embedded) any task widgets.
  revalidatePath("/goals"); // nav bell renders in the shared layout on every route
  revalidatePath("/habits");
  revalidatePath("/health");
  revalidatePath("/roadmaps");
  revalidatePath("/expenses");
}

function parseRecurrence(formData: FormData): TaskRecurrence {
  const raw = String(formData.get("recurrence") ?? "one_off");
  return RECURRENCES.includes(raw as TaskRecurrence) ? (raw as TaskRecurrence) : "one_off";
}

/** `1..7`, deduped and sorted — same parsing rule `habits/actions.ts` uses. */
function parseScheduledDays(formData: FormData): number[] | null {
  const raw = formData.getAll("scheduledDays").map(Number);
  const days = [...new Set(raw.filter((n) => Number.isInteger(n) && n >= 1 && n <= 7))].sort(
    (a, b) => a - b,
  );
  return days.length > 0 ? days : null;
}

export async function addTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required" };

  const dueDate = String(formData.get("dueDate") ?? "").trim() || today();
  const recurrence = parseRecurrence(formData);

  if (recurrence === "weekly" && parseScheduledDays(formData) === null) {
    return { error: "Pick at least one weekday for a weekly task" };
  }

  const notes = String(formData.get("notes") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  await db.insert(tasks).values({
    title,
    dueDate,
    recurrence,
    scheduledDays: recurrence === "weekly" ? parseScheduledDays(formData) : null,
    notes: notes || null,
    category: category || null,
  });

  revalidateAll();
  return { ok: true };
}

/** The one-line "type and hit enter" bar — always a one-off task due today. */
export async function quickAddTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required" };

  await db.insert(tasks).values({ title, dueDate: today(), recurrence: "one_off" });
  revalidateAll();
  return { ok: true };
}

export async function updateTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  if (!Number.isFinite(id)) return { error: "Missing task" };
  if (!title) return { error: "Title is required" };

  const dueDate = String(formData.get("dueDate") ?? "").trim();
  if (!dueDate) return { error: "Due date is required" };

  const recurrence = parseRecurrence(formData);
  if (recurrence === "weekly" && parseScheduledDays(formData) === null) {
    return { error: "Pick at least one weekday for a weekly task" };
  }

  const notes = String(formData.get("notes") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  await db
    .update(tasks)
    .set({
      title,
      dueDate,
      recurrence,
      scheduledDays: recurrence === "weekly" ? parseScheduledDays(formData) : null,
      notes: notes || null,
      category: category || null,
    })
    .where(eq(tasks.id, id));

  revalidateAll();
  return { ok: true };
}

/**
 * Toggle a task's check-off. One-off tasks flip `completedAt` between null
 * and now(); recurring tasks upsert-negate today's `task_completions` row —
 * the exact same "single statement, never read-then-write" shape as
 * `toggleHabit`. The caller already knows the task's recurrence (it's
 * rendering the row), so it's passed in rather than re-queried here.
 */
export async function toggleTask(id: number, recurrence: TaskRecurrence, date?: string) {
  if (recurrence === "one_off") {
    await db
      .update(tasks)
      .set({ completedAt: sql`case when ${tasks.completedAt} is null then now() else null end` })
      .where(eq(tasks.id, id));
  } else {
    const day = date ?? today();
    await db
      .insert(taskCompletions)
      .values({ taskId: id, date: day, done: true })
      .onConflictDoUpdate({
        target: [taskCompletions.taskId, taskCompletions.date],
        set: { done: sql`not ${taskCompletions.done}` },
      });
  }

  revalidateAll();
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidateAll();
}
