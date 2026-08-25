"use client";

import { startTransition, useActionState, useOptimistic } from "react";
import {
  Badge,
  Button,
  Card,
  CheckMark,
  Disclosure,
  EmptyState,
  Field,
  Input,
  ProgressBar,
  ProgressRing,
  Select,
  StatTile,
  TOPIC_STATUS_LABEL,
} from "@/components/ui";
import { useToast } from "@/components/Toast";
import {
  computeRoadmapProgress,
  formatPercent,
  isCounted,
  type TopicKind,
  type TopicStatus,
} from "@/lib/roadmap-progress";
import { addGroup, addTopic, cycleTopicStatus, type FormState } from "./actions";

export type TopicNode = {
  id: number;
  parentId: number | null;
  title: string;
  kind: TopicKind;
  status: TopicStatus;
  resourceLink: string | null;
};

const NEXT_STATUS: Record<TopicStatus, TopicStatus> = {
  not_started: "learning",
  learning: "done",
  done: "not_started",
};

export default function RoadmapView({
  roadmapId,
  topics,
}: {
  roadmapId: number;
  topics: TopicNode[];
}) {
  // Optimistic cycling. The bars are recomputed with the SAME pure rollup the
  // server uses, so an in-flight tap can never show a number the server
  // wouldn't agree with once it responds.
  const [optimisticTopics, cycleLocally] = useOptimistic(
    topics,
    (state: TopicNode[], id: number) =>
      state.map((t) => (t.id === id ? { ...t, status: NEXT_STATUS[t.status] } : t)),
  );

  const progress = computeRoadmapProgress(optimisticTopics);

  // "Learning" is a display stat only — the percentage still comes entirely
  // from the shared rollup above. A leaf is a topic nothing points at, matching
  // how `computeRoadmapProgress` decides what counts.
  const parents = new Set(optimisticTopics.map((t) => t.parentId));
  const learning = optimisticTopics.filter(
    (t) => !parents.has(t.id) && isCounted(t) && t.status === "learning",
  ).length;
  const remaining = progress.total - progress.done;
  const toast = useToast();

  function handleCycle(id: number, currentStatus: TopicStatus, title: string) {
    if (currentStatus === "learning") toast(`${title} · done`, "done");
    startTransition(async () => {
      cycleLocally(id);
      await cycleTopicStatus(id);
    });
  }

  return (
    <>
      {/* Overall progress — the headline for the whole roadmap. */}
      <Card className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-4 p-5">
        <ProgressRing value={progress.percent} size={76} stroke={6}>
          <span
            className="font-mono text-sm font-semibold tabular-nums"
            data-testid="roadmap-percent"
          >
            {formatPercent(progress.percent)}
          </span>
        </ProgressRing>

        <div className="min-w-[12rem] flex-1">
          <p className="text-sm text-muted" data-testid="roadmap-counts">
            {progress.done} of {progress.total} counted topics
          </p>
          <ProgressBar
            value={progress.percent ?? 0}
            tone={progress.percent === 100 ? "done" : "accent"}
            className="mt-2.5"
          />
        </div>

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile label="Done" value={progress.done} tone="done" />
          <StatTile label="Learning" value={learning} tone="wip" />
          <StatTile label="Left" value={remaining} tone="neutral" />
        </dl>
      </Card>

      {progress.groups.length === 0 ? (
        <EmptyState
          title="No groups yet"
          hint="Add a group below, then hang topics off it."
        />
      ) : (
        /* CSS multi-column rather than grid: group cards vary a lot in height,
           and a grid would leave a tall void beside every short one. */
        <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
          {progress.groups.map((g) => (
            <Card
              key={g.group.id}
              className="mb-4 break-inside-avoid overflow-hidden"
            >
              <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <ProgressRing value={g.percent} size={34} stroke={3} />
                <h2 className="min-w-0 flex-1 truncate font-display text-sm font-semibold">
                  {g.group.title}
                </h2>
                <span className="shrink-0 font-mono text-2xs tabular-nums text-faint">
                  {g.total > 0 ? `${g.done}/${g.total} · ` : ""}
                  {formatPercent(g.percent)}
                </span>
              </header>

              <ul>
                {g.children.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-faint">No topics yet.</li>
                ) : (
                  g.children.map((t) => (
                    <TopicRow key={t.id} topic={t} onCycle={() => handleCycle(t.id, t.status, t.title)} />
                  ))
                )}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 max-w-2xl text-xs leading-relaxed text-faint">
        Only <strong className="font-medium text-muted">core</strong> and{" "}
        <strong className="font-medium text-muted">recommended</strong> topics count
        toward the percentages. Alternatives are pick-one, so they and optionals are
        shown dimmed and left out of the maths.
      </p>

      <AddForms roadmapId={roadmapId} groups={progress.groups.map((g) => g.group)} />
    </>
  );
}

function TopicRow({ topic, onCycle }: { topic: TopicNode; onCycle: () => void }) {
  const counted = isCounted(topic);
  const done = topic.status === "done";

  return (
    <li className="border-b border-line last:border-b-0">
      <div
        className={`flex items-center gap-2 pr-3 transition-colors hover:bg-raised ${
          counted ? "" : "opacity-60"
        }`}
      >
        <button
          type="button"
          onClick={onCycle}
          aria-label={`${topic.title} — ${TOPIC_STATUS_LABEL[topic.status]}, tap to change`}
          data-testid="topic-row"
          data-status={topic.status}
          data-title={topic.title}
          className="flex flex-1 items-center gap-2.5 py-2.5 pl-4 text-left"
        >
          <StatusDot status={topic.status} />
          <span
            className={`flex-1 text-sm ${done ? "text-faint line-through" : ""}`}
          >
            {topic.title}
          </span>
          {topic.kind !== "core" && (
            <Badge tone={topic.kind === "recommended" ? "accent" : "idle"}>
              {topic.kind}
            </Badge>
          )}
        </button>

        {topic.resourceLink && (
          <a
            href={topic.resourceLink}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Open resource for ${topic.title}`}
            className="shrink-0 rounded p-1 text-faint transition-colors hover:text-accent"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden
            >
              <path
                d="M14 5h5v5M19 5l-7 7M18 14v5H5V6h5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        )}
      </div>
    </li>
  );
}

/**
 * Shape carries the state as well as colour — filled tick, ringed dot, empty
 * ring — so the three statuses are still distinguishable without hue.
 */
function StatusDot({ status }: { status: TopicStatus }) {
  // `key={status}` forces a remount on every cycle (done→not_started→learning
  // are visually distinct shapes, not a color patch), so `pop-in` reliably
  // replays each tap rather than only on first mount.
  if (status === "done") {
    return (
      <span key={status} className="pop-in flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-done text-canvas transition-colors">
        <CheckMark className="h-2.5 w-2.5" />
      </span>
    );
  }

  if (status === "learning") {
    return (
      <span key={status} className="pop-in flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-wip transition-colors">
        <span className="h-1.5 w-1.5 rounded-full bg-wip" />
      </span>
    );
  }

  return (
    <span key={status} className="pop-in h-[18px] w-[18px] shrink-0 rounded-full border-2 border-line-strong transition-colors" />
  );
}

/* -------------------------------------------------------------------------
 * Manual add — writes to the same tables as the seed.
 * ---------------------------------------------------------------------- */

function AddForms({
  roadmapId,
  groups,
}: {
  roadmapId: number;
  groups: { id: number; title: string }[];
}) {
  const [groupState, groupAction] = useActionState<FormState, FormData>(addGroup, {});
  const [topicState, topicAction] = useActionState<FormState, FormData>(addTopic, {});

  return (
    <Disclosure label="+ Add group or topic" className="mt-6">
      <div className="grid gap-6 md:grid-cols-2">
        <form action={groupAction} className="space-y-2">
          <input type="hidden" name="roadmapId" value={roadmapId} />
          <Field label="New group">
            <div className="flex gap-2">
              <Input name="title" required placeholder="e.g. Testing" />
              <Button type="submit" variant="primary" className="shrink-0">
                Add group
              </Button>
            </div>
          </Field>
          {groupState.error && (
            <p role="alert" className="text-xs text-warn">
              {groupState.error}
            </p>
          )}
        </form>

        <form action={topicAction} className="space-y-2">
          <input type="hidden" name="roadmapId" value={roadmapId} />
          <Field label="New topic">
            <Select name="parentId" required defaultValue="">
              <option value="" disabled>
                Pick a group…
              </option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </Select>
          </Field>
          <Input name="title" required placeholder="Topic title" />
          <Input name="link" type="url" placeholder="Resource link (optional)" />
          <div className="flex gap-2">
            <Select name="kind" defaultValue="core" className="min-w-0 flex-1">
              <option value="core">core — counts</option>
              <option value="recommended">recommended — counts</option>
              <option value="alternative">alternative — not counted</option>
              <option value="optional">optional — not counted</option>
            </Select>
            <Button type="submit" variant="primary" className="shrink-0">
              Add topic
            </Button>
          </div>
          {topicState.error && (
            <p role="alert" className="text-xs text-warn">
              {topicState.error}
            </p>
          )}
        </form>
      </div>
    </Disclosure>
  );
}
