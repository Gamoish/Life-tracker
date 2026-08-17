"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { goalMilestones, goals } from "@/db/schema";
import { clampPercent, type GoalStatus } from "@/lib/goal-progress";

export type FormState = { error?: string; ok?: boolean };

const STATUSES: GoalStatus[] = ["active", "done", "dropped"];
export type GoalTerm = "short" | "long";
const TERMS: GoalTerm[] = ["short", "long"];

function revalidateAll() {
  revalidatePath("/goals");
  revalidatePath("/");
}

/** Free-text but required — an uncategorized goal can't be grouped or filtered. */
function parseCategory(formData: FormData): { value?: string; error?: string } {
  const value = String(formData.get("category") ?? "").trim();
  if (!value) return { error: "Category is required" };
  return { value };
}

function parseTerm(formData: FormData): { value?: GoalTerm; error?: string } {
  const raw = String(formData.get("term") ?? "");
  if (!TERMS.includes(raw as GoalTerm)) return { error: "Pick short-term or long-term" };
  return { value: raw as GoalTerm };
}

export async function addGoal(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required" };

  const category = parseCategory(formData);
  if (category.error) return { error: category.error };

  const term = parseTerm(formData);
  if (term.error) return { error: term.error };

  const description = String(formData.get("description") ?? "").trim();
  const targetDate = String(formData.get("targetDate") ?? "").trim();
  const source = String(formData.get("progressSource") ?? "manual");
  const roadmapRaw = String(formData.get("roadmapId") ?? "").trim();

  const isRoadmap = source === "roadmap";
  const roadmapId = isRoadmap && roadmapRaw ? Number(roadmapRaw) : null;

  if (isRoadmap && roadmapId === null) {
    return { error: "Pick a roadmap to track" };
  }

  const [goal] = await db
    .insert(goals)
    .values({
      title,
      description: description || null,
      targetDate: targetDate || null,
      category: category.value!,
      term: term.value!,
      progressSource: isRoadmap ? "roadmap" : "manual",
      roadmapId,
      manualProgress: clampPercent(Number(formData.get("manualProgress") ?? 0)),
    })
    .returning();

  // Optional inline milestones, one per line.
  const raw = String(formData.get("milestones") ?? "");
  const titles = raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (titles.length > 0 && !isRoadmap) {
    await db.insert(goalMilestones).values(
      titles.map((t, i) => ({ goalId: goal.id, title: t, sortOrder: i })),
    );
  }

  revalidateAll();
  return { ok: true };
}

export async function updateGoal(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  if (!Number.isFinite(id)) return { error: "Missing goal" };
  if (!title) return { error: "Title is required" };

  const category = parseCategory(formData);
  if (category.error) return { error: category.error };

  const term = parseTerm(formData);
  if (term.error) return { error: term.error };

  const description = String(formData.get("description") ?? "").trim();
  const targetDate = String(formData.get("targetDate") ?? "").trim();

  await db
    .update(goals)
    .set({
      title,
      description: description || null,
      targetDate: targetDate || null,
      category: category.value!,
      term: term.value!,
    })
    .where(eq(goals.id, id));

  revalidateAll();
  return { ok: true };
}

/**
 * Status is always an explicit user choice — nothing in this module flips it
 * automatically when progress reaches 100%.
 */
export async function setGoalStatus(id: number, status: GoalStatus) {
  if (!STATUSES.includes(status)) return;
  await db.update(goals).set({ status }).where(eq(goals.id, id));
  revalidateAll();
}

/** Only meaningful for a manual goal with no milestones. */
export async function setManualProgress(id: number, value: number) {
  await db
    .update(goals)
    .set({ manualProgress: clampPercent(value) })
    .where(eq(goals.id, id));
  revalidateAll();
}

export async function deleteGoal(id: number) {
  await db.delete(goals).where(eq(goals.id, id));
  revalidateAll();
}

export async function addMilestone(_prev: FormState, formData: FormData): Promise<FormState> {
  const goalId = Number(formData.get("goalId"));
  const title = String(formData.get("title") ?? "").trim();
  if (!Number.isFinite(goalId)) return { error: "Missing goal" };
  if (!title) return { error: "Title is required" };

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${goalMilestones.sortOrder}), -1) + 1` })
    .from(goalMilestones)
    .where(eq(goalMilestones.goalId, goalId));

  await db.insert(goalMilestones).values({ goalId, title, sortOrder: next });
  revalidateAll();
  return { ok: true };
}

/** Single UPDATE with a negation, so rapid taps can't lose one. */
export async function toggleMilestone(id: number) {
  await db
    .update(goalMilestones)
    .set({ done: sql`not ${goalMilestones.done}` })
    .where(eq(goalMilestones.id, id));
  revalidateAll();
}

export async function deleteMilestone(id: number) {
  await db.delete(goalMilestones).where(eq(goalMilestones.id, id));
  revalidateAll();
}
