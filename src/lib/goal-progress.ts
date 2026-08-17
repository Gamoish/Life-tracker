/**
 * Goal progress rules. Pure — no DB imports — so the precedence below is
 * unit-testable in isolation.
 *
 * Progress is always COMPUTED, never read back as stored truth. The only
 * persisted number is `manual_progress`, and that is used solely as the
 * fallback for a manual goal with no milestones.
 *
 * Precedence, in strict order:
 *
 *   1. source = 'roadmap' AND roadmap_id is set
 *        -> the linked roadmap's overall %, supplied by the caller from
 *           `roadmap-queries.ts`. Never recomputed here.
 *   2. source = 'roadmap' but roadmap_id is null (the roadmap was deleted;
 *      the FK is ON DELETE SET NULL so the goal survives)
 *        -> fall back to the manual rules below.
 *   3. manual WITH milestones  -> done milestones / total milestones.
 *      Milestones WIN over the slider whenever any exist.
 *   4. manual WITHOUT milestones -> the stored `manual_progress` slider.
 *
 * A null percent ("—") is distinct from 0%: it means not scored, and a goal in
 * that state must not be offered as ready-to-complete.
 */

export type GoalProgressSource = "manual" | "roadmap";
export type GoalStatus = "active" | "done" | "dropped";

/** Which rule actually produced the number — drives the UI caption. */
export type GoalProgressKind = "roadmap" | "milestones" | "manual";

export type GoalProgress = {
  /** 0–100, or null when not scored. */
  percent: number | null;
  kind: GoalProgressKind;
  /** Populated for `roadmap` (topics) and `milestones` (milestones). */
  detail: { done: number; total: number } | null;
  /** True when the goal fell back to manual because its roadmap vanished. */
  orphanedFromRoadmap: boolean;
};

export type GoalProgressInput = {
  progressSource: GoalProgressSource;
  roadmapId: number | null;
  manualProgress: number;
};

/** Shape supplied by `roadmap-queries.getRoadmapProgress`. */
export type RoadmapTally = { done: number; total: number; percent: number | null };

export function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeGoalProgress(
  goal: GoalProgressInput,
  opts: {
    /** The linked roadmap's tally, or null/undefined if unavailable. */
    roadmapProgress?: RoadmapTally | null;
    milestones?: { done: boolean }[];
  } = {},
): GoalProgress {
  const milestones = opts.milestones ?? [];

  if (goal.progressSource === "roadmap" && goal.roadmapId !== null) {
    const tally = opts.roadmapProgress;
    // Roadmap linked but its rows weren't supplied — report not-scored rather
    // than silently inventing a manual number under a "roadmap" caption.
    if (!tally) {
      return { percent: null, kind: "roadmap", detail: null, orphanedFromRoadmap: false };
    }
    return {
      percent: tally.percent,
      kind: "roadmap",
      detail: { done: tally.done, total: tally.total },
      orphanedFromRoadmap: false,
    };
  }

  const orphaned = goal.progressSource === "roadmap" && goal.roadmapId === null;

  if (milestones.length > 0) {
    const done = milestones.filter((m) => m.done).length;
    return {
      percent: clampPercent((done / milestones.length) * 100),
      kind: "milestones",
      detail: { done, total: milestones.length },
      orphanedFromRoadmap: orphaned,
    };
  }

  return {
    percent: clampPercent(goal.manualProgress),
    kind: "manual",
    detail: null,
    orphanedFromRoadmap: orphaned,
  };
}

/**
 * Overdue = target date strictly in the past AND still active. A done or
 * dropped goal is never overdue, however old its target.
 */
export function isOverdue(
  goal: { targetDate: string | null; status: GoalStatus },
  today: string,
): boolean {
  if (goal.status !== "active") return false;
  if (!goal.targetDate) return false;
  return goal.targetDate < today; // ISO dates sort lexicographically
}

/**
 * A hint only. Status is user-controlled — reaching 100% never flips a goal to
 * `done` on its own.
 */
export function isReadyToComplete(
  progress: GoalProgress,
  status: GoalStatus,
): boolean {
  return status === "active" && progress.percent === 100;
}
