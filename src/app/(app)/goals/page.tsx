import { asc, inArray } from "drizzle-orm";
import { PageHeader } from "@/components/ui";
import { db } from "@/db";
import { goalMilestones, goals } from "@/db/schema";
import { today } from "@/lib/date";
import { getRoadmapProgressMap, listRoadmaps } from "@/lib/roadmap-queries";
import GoalsView, { type GoalNode, type MilestoneNode } from "./GoalsView";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const [goalRows, roadmapRows] = await Promise.all([
    db.select().from(goals).orderBy(asc(goals.status), asc(goals.id)),
    listRoadmaps(),
  ]);

  const goalIds = goalRows.map((g) => g.id);
  const milestoneRows =
    goalIds.length > 0
      ? await db
          .select()
          .from(goalMilestones)
          .where(inArray(goalMilestones.goalId, goalIds))
          .orderBy(asc(goalMilestones.sortOrder), asc(goalMilestones.id))
      : [];

  const milestonesByGoal = new Map<number, MilestoneNode[]>();
  for (const m of milestoneRows) {
    const node = { id: m.id, title: m.title, done: m.done };
    const bucket = milestonesByGoal.get(m.goalId);
    if (bucket) bucket.push(node);
    else milestonesByGoal.set(m.goalId, [node]);
  }

  // Roadmap percentages come from the shared query path — the same one the
  // Roadmaps page renders from — batched into a single round-trip.
  const linkedIds = goalRows
    .map((g) => g.roadmapId)
    .filter((id): id is number => id !== null);
  const progressByRoadmap = await getRoadmapProgressMap(linkedIds);
  const roadmapById = new Map(roadmapRows.map((r) => [r.id, r]));

  const nodes: GoalNode[] = goalRows.map((g) => {
    const rm = g.roadmapId === null ? null : roadmapById.get(g.roadmapId);
    const tally = g.roadmapId === null ? null : progressByRoadmap.get(g.roadmapId);

    return {
      id: g.id,
      title: g.title,
      description: g.description,
      targetDate: g.targetDate,
      status: g.status,
      category: g.category,
      term: g.term,
      progressSource: g.progressSource,
      roadmapId: g.roadmapId,
      manualProgress: g.manualProgress,
      milestones: milestonesByGoal.get(g.id) ?? [],
      roadmapTally:
        rm && tally
          ? {
              name: rm.name,
              slug: rm.slug,
              done: tally.done,
              total: tally.total,
              percent: tally.percent,
            }
          : null,
    };
  });

  const active = nodes.filter((g) => g.status === "active").length;

  // Distinct non-empty categories, for the filter row and the "+ Add goal"
  // datalist — same pattern the DSA topic input used.
  const categories = [...new Set(goalRows.map((g) => g.category).filter(Boolean))].sort();

  return (
    <>
      <PageHeader
        title="Goals"
        subtitle={nodes.length > 0 ? `${active} active` : undefined}
      />
      <GoalsView
        goals={nodes}
        roadmaps={roadmapRows.map((r) => ({ id: r.id, name: r.name }))}
        categories={categories}
        today={today()}
      />
    </>
  );
}
