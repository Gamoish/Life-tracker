"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { roadmaps, roadmapTopics } from "@/db/schema";
import type { TopicKind } from "@/lib/roadmap-progress";

const KINDS: TopicKind[] = ["core", "recommended", "alternative", "optional"];

/** A roadmap % appears on Today and on any goal tracking it, so refresh those too. */
function revalidateAll() {
  revalidatePath("/roadmaps");
  revalidatePath("/goals");
  revalidatePath("/");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * not_started -> learning -> done -> not_started
 *
 * Done as a single UPDATE with a CASE rather than read-then-write, so two fast
 * taps can't both read the same old value and lose one step.
 */
export async function cycleTopicStatus(topicId: number) {
  await db
    .update(roadmapTopics)
    .set({
      status: sql`(case ${roadmapTopics.status}
        when 'not_started' then 'learning'
        when 'learning' then 'done'
        else 'not_started' end)::topic_status`,
      updatedAt: new Date(),
    })
    .where(eq(roadmapTopics.id, topicId));

  revalidateAll();
}

export type FormState = { error?: string; ok?: boolean };

export async function addRoadmap(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };

  const slug = slugify(name);
  if (!slug) return { error: "Name needs at least one letter or number" };

  const existing = await db.select().from(roadmaps).where(eq(roadmaps.slug, slug)).limit(1);
  if (existing.length > 0) return { error: `"${slug}" already exists` };

  await db.insert(roadmaps).values({ slug, name });
  revalidateAll();
  return { ok: true };
}

/** Adds a top-level group (parent_id = null). */
export async function addGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const roadmapId = Number(formData.get("roadmapId"));
  const title = String(formData.get("title") ?? "").trim();
  if (!Number.isFinite(roadmapId)) return { error: "Missing roadmap" };
  if (!title) return { error: "Title is required" };

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${roadmapTopics.sortOrder}), -1) + 1` })
    .from(roadmapTopics)
    .where(and(eq(roadmapTopics.roadmapId, roadmapId), isNull(roadmapTopics.parentId)));

  await db
    .insert(roadmapTopics)
    .values({ roadmapId, parentId: null, title, kind: "core", sortOrder: next })
    // Same upsert key the seed uses, so a manual add can't collide with a re-seed.
    .onConflictDoNothing({
      target: [roadmapTopics.roadmapId, roadmapTopics.parentId, roadmapTopics.title],
    });

  revalidateAll();
  return { ok: true };
}

/** Adds a leaf topic under an existing group. */
export async function addTopic(_prev: FormState, formData: FormData): Promise<FormState> {
  const roadmapId = Number(formData.get("roadmapId"));
  const parentId = Number(formData.get("parentId"));
  const title = String(formData.get("title") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim();
  const rawKind = String(formData.get("kind") ?? "core");
  const kind = (KINDS as string[]).includes(rawKind) ? (rawKind as TopicKind) : "core";

  if (!Number.isFinite(roadmapId)) return { error: "Missing roadmap" };
  if (!Number.isFinite(parentId)) return { error: "Pick a group" };
  if (!title) return { error: "Title is required" };

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${roadmapTopics.sortOrder}), -1) + 1` })
    .from(roadmapTopics)
    .where(eq(roadmapTopics.parentId, parentId));

  await db
    .insert(roadmapTopics)
    .values({
      roadmapId,
      parentId,
      title,
      kind,
      sortOrder: next,
      resourceLink: link || null,
    })
    .onConflictDoNothing({
      target: [roadmapTopics.roadmapId, roadmapTopics.parentId, roadmapTopics.title],
    });

  revalidateAll();
  return { ok: true };
}

/** Cascades to child topics, and nulls `roadmap_id` on any goal tracking it. */
export async function deleteRoadmap(roadmapId: number) {
  await db.delete(roadmaps).where(eq(roadmaps.id, roadmapId));
  revalidateAll();
}
