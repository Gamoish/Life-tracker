import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { roadmaps, roadmapTopics } from "@/db/schema";
import { computeRoadmapProgress, type RoadmapProgress } from "./roadmap-progress";

/**
 * The single DB path for roadmap completion.
 *
 * Anything that displays a roadmap percentage — the Roadmaps page, a
 * roadmap-linked Goal — must go through here. The math itself lives in the
 * pure, unit-tested `roadmap-progress.ts`; this file only fetches rows and
 * hands them to it. If two screens ever disagree about a roadmap's %, it's
 * because something bypassed this module.
 */

export type RoadmapRow = typeof roadmaps.$inferSelect;
export type RoadmapTopicRow = typeof roadmapTopics.$inferSelect;
export type RoadmapProgressResult = RoadmapProgress<RoadmapTopicRow>;

export function listRoadmaps() {
  return db.select().from(roadmaps).orderBy(asc(roadmaps.name));
}

export function getRoadmapBySlug(slug: string) {
  return db.select().from(roadmaps).where(eq(roadmaps.slug, slug)).limit(1);
}

/** One roadmap's topic rows, already in render order. */
export function getRoadmapTopics(roadmapId: number) {
  return db
    .select()
    .from(roadmapTopics)
    .where(eq(roadmapTopics.roadmapId, roadmapId))
    .orderBy(asc(roadmapTopics.sortOrder), asc(roadmapTopics.id));
}

/** Progress for a single roadmap. */
export async function getRoadmapProgress(
  roadmapId: number,
): Promise<RoadmapProgressResult> {
  return computeRoadmapProgress(await getRoadmapTopics(roadmapId));
}

/**
 * Progress for many roadmaps in one round-trip — the Goals list can link
 * several goals to several roadmaps, and per-goal queries would be N+1.
 *
 * Deliberately reuses the same `computeRoadmapProgress`, so a batched result is
 * always identical to the single-roadmap result for the same id.
 */
export async function getRoadmapProgressMap(
  roadmapIds: number[],
): Promise<Map<number, RoadmapProgressResult>> {
  const ids = [...new Set(roadmapIds)];
  const out = new Map<number, RoadmapProgressResult>();
  if (ids.length === 0) return out;

  const rows = await db
    .select()
    .from(roadmapTopics)
    .where(inArray(roadmapTopics.roadmapId, ids))
    .orderBy(asc(roadmapTopics.sortOrder), asc(roadmapTopics.id));

  const byRoadmap = new Map<number, RoadmapTopicRow[]>();
  for (const row of rows) {
    const bucket = byRoadmap.get(row.roadmapId);
    if (bucket) bucket.push(row);
    else byRoadmap.set(row.roadmapId, [row]);
  }

  for (const id of ids) {
    out.set(id, computeRoadmapProgress(byRoadmap.get(id) ?? []));
  }
  return out;
}
