/**
 * Roadmap completion rollup.
 *
 * Pure on purpose — no database imports — so it can be unit-tested in isolation
 * and reused anywhere. The Goals module reads roadmap-sourced progress through
 * this; `src/lib/roadmap-queries.ts` is the DB-backed wrapper.
 *
 * The counting rule:
 *
 *   leaf        a topic with no children (at any depth)
 *   denominator leaves whose kind is `core` or `recommended`
 *   numerator   those same leaves with status `done`
 *
 * `alternative` and `optional` are excluded from BOTH sides. Alternatives are
 * pick-one — you'll learn React, not also Vue and Angular — so counting them
 * would permanently cap the bar below 100%. `recommended` is the happy-path
 * pick, so it does count and completing it moves the bar.
 *
 * A zero denominator (e.g. a group that is nothing but alternatives) yields
 * `null`, not 0 — "not scored" is a different statement from "none done", and
 * the UI renders it as "—".
 */

export type TopicKind = "core" | "recommended" | "alternative" | "optional";
export type TopicStatus = "not_started" | "learning" | "done";

/** Structural — any row with these fields works, including Drizzle's. */
export type ProgressTopic = {
  id: number;
  parentId: number | null;
  kind: TopicKind;
  status: TopicStatus;
};

export type Tally = {
  done: number;
  /** Counted leaves only (core + recommended). */
  total: number;
  /** null when total is 0 — render as "—", never 0%. */
  percent: number | null;
};

export type GroupProgress<T extends ProgressTopic = ProgressTopic> = Tally & {
  group: T;
  children: T[];
};

export type RoadmapProgress<T extends ProgressTopic = ProgressTopic> = Tally & {
  groups: GroupProgress<T>[];
};

const COUNTED_KINDS: ReadonlySet<TopicKind> = new Set<TopicKind>([
  "core",
  "recommended",
]);

/** Does this topic's kind affect the percentage at all? */
export function isCounted(topic: Pick<ProgressTopic, "kind">): boolean {
  return COUNTED_KINDS.has(topic.kind);
}

function tally(leaves: ProgressTopic[]): Tally {
  const counted = leaves.filter(isCounted);
  const done = counted.filter((l) => l.status === "done").length;
  const total = counted.length;
  return {
    done,
    total,
    percent: total === 0 ? null : Math.round((done / total) * 100),
  };
}

/**
 * Every leaf at or under `node`. Recursive rather than assuming two levels —
 * the schema's self-FK permits deeper nesting, and a childless top-level row is
 * itself a leaf.
 */
function leavesUnder<T extends ProgressTopic>(
  node: T,
  childrenOf: Map<number, T[]>,
): T[] {
  const kids = childrenOf.get(node.id);
  if (!kids || kids.length === 0) return [node];
  return kids.flatMap((kid) => leavesUnder(kid, childrenOf));
}

/**
 * Roll up a flat list of topic rows (one roadmap's worth) into per-group and
 * overall progress. Input order is preserved; sort before calling if you want
 * `sort_order` respected.
 */
export function computeRoadmapProgress<T extends ProgressTopic>(
  topics: T[],
): RoadmapProgress<T> {
  const childrenOf = new Map<number, T[]>();
  for (const t of topics) {
    if (t.parentId === null) continue;
    const bucket = childrenOf.get(t.parentId);
    if (bucket) bucket.push(t);
    else childrenOf.set(t.parentId, [t]);
  }

  const topLevel = topics.filter((t) => t.parentId === null);

  const groups: GroupProgress<T>[] = topLevel.map((group) => ({
    group,
    children: childrenOf.get(group.id) ?? [],
    ...tally(leavesUnder(group, childrenOf)),
  }));

  // Every leaf belongs to exactly one top-level subtree, so the roadmap tally is
  // the union of the groups' leaves — computed directly to stay correct even if
  // a row's parent is missing from the input.
  const allLeaves = topLevel.flatMap((group) => leavesUnder(group, childrenOf));

  return { groups, ...tally(allLeaves) };
}

/** Convenience for the Goals module: just the number (or null). */
export function roadmapPercent(topics: ProgressTopic[]): number | null {
  return computeRoadmapProgress(topics).percent;
}

/** "72%" / "—" */
export function formatPercent(percent: number | null): string {
  return percent === null ? "—" : `${percent}%`;
}
