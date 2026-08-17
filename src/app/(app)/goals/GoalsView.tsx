"use client";

import Link from "next/link";
import { startTransition, useActionState, useMemo, useOptimistic, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CheckMark,
  Disclosure,
  EmptyState,
  Field,
  GOAL_STATUS_TONE,
  Input,
  Pill,
  ProgressRing,
  SectionHeader,
  SegmentedControl,
  Select,
  TextButton,
  Textarea,
  type Tone,
} from "@/components/ui";
import { IconAdd } from "@/components/icons";
import { useToast } from "@/components/Toast";
import {
  computeGoalProgress,
  isOverdue,
  isReadyToComplete,
  type GoalStatus,
} from "@/lib/goal-progress";
import { formatShort } from "@/lib/date";
import {
  addGoal,
  addMilestone,
  deleteGoal,
  deleteMilestone,
  setGoalStatus,
  setManualProgress,
  toggleMilestone,
  updateGoal,
  type FormState,
  type GoalTerm,
} from "./actions";

export type MilestoneNode = { id: number; title: string; done: boolean };

export type RoadmapTallyNode = {
  name: string;
  slug: string;
  done: number;
  total: number;
  percent: number | null;
};

export type GoalNode = {
  id: number;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: GoalStatus;
  category: string;
  term: GoalTerm;
  progressSource: "manual" | "roadmap";
  roadmapId: number | null;
  manualProgress: number;
  milestones: MilestoneNode[];
  /** Pre-resolved by the server via the shared roadmap query path. */
  roadmapTally: RoadmapTallyNode | null;
};

export default function GoalsView({
  goals,
  roadmaps,
  categories,
  today,
}: {
  goals: GoalNode[];
  roadmaps: { id: number; name: string }[];
  categories: string[];
  today: string;
}) {
  const [category, setCategory] = useState<string>("all");

  const visible = useMemo(
    () => goals.filter((g) => category === "all" || g.category === category),
    [goals, category],
  );

  const longTerm = visible.filter((g) => g.term === "long");
  const shortTerm = visible.filter((g) => g.term === "short");

  return (
    <>
      {categories.length > 0 && (
        <div className="mb-5 flex items-start gap-2">
          <span className="w-16 shrink-0 pt-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-faint">
            Category
          </span>
          <SegmentedControl
            testId="filter-category"
            ariaLabel="Category"
            value={category}
            onChange={setCategory}
            options={["all", ...categories].map((c) => ({ value: c, label: c }))}
          />
        </div>
      )}

      {goals.length === 0 ? (
        <EmptyState
          icon={<IconAdd />}
          title="No goals yet"
          hint="Add your first one below — track it by hand, break it into milestones, or point it at a roadmap and let it move itself."
        />
      ) : visible.length === 0 ? (
        <EmptyState title="Nothing matches this filter." hint="Clear the category filter to see more." />
      ) : (
        <div className="space-y-8">
          {longTerm.length > 0 && (
            <div>
              <SectionHeader title="Long-term" right={String(longTerm.length)} />
              <GoalList goals={longTerm} today={today} />
            </div>
          )}
          {shortTerm.length > 0 && (
            <div>
              <SectionHeader title="Short-term" right={String(shortTerm.length)} />
              <GoalList goals={shortTerm} today={today} />
            </div>
          )}
        </div>
      )}

      <AddGoalForm roadmaps={roadmaps} categories={categories} />
    </>
  );
}

function GoalList({ goals, today }: { goals: GoalNode[]; today: string }) {
  return (
    /* Multi-column, not grid: a slider goal and a six-milestone goal differ
       wildly in height, and a grid would leave a void beside the short one. */
    <ul className="columns-1 gap-4 lg:columns-2">
      {goals.map((g) => (
        <li key={g.id} className="mb-4 break-inside-avoid">
          <GoalCard goal={g} today={today} />
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------------- */

function GoalCard({ goal, today }: { goal: GoalNode; today: string }) {
  const [editing, setEditing] = useState(false);
  const toast = useToast();

  // Optimistic milestone toggles; progress is recomputed from the same pure
  // rule set the server uses, so the bar can't disagree with the server.
  const [milestones, toggleLocally] = useOptimistic(
    goal.milestones,
    (state: MilestoneNode[], id: number) =>
      state.map((m) => (m.id === id ? { ...m, done: !m.done } : m)),
  );

  const [slider, setSlider] = useState(goal.manualProgress);

  const progress = computeGoalProgress(
    {
      progressSource: goal.progressSource,
      roadmapId: goal.roadmapId,
      manualProgress: slider,
    },
    { roadmapProgress: goal.roadmapTally, milestones },
  );

  const overdue = isOverdue({ targetDate: goal.targetDate, status: goal.status }, today);
  const ready = isReadyToComplete(progress, goal.status);
  const inactive = goal.status !== "active";

  const ringTone: Tone = inactive
    ? GOAL_STATUS_TONE[goal.status]
    : overdue
      ? "warn"
      : progress.percent === 100
        ? "done"
        : "accent";

  return (
    <Card
      className={`p-4 transition-colors ${overdue ? "border-warn/40" : ""} ${
        inactive ? "opacity-60" : ""
      }`}
      data-testid="goal-card"
      data-title={goal.title}
      data-status={goal.status}
      data-overdue={overdue ? "true" : "false"}
      data-kind={progress.kind}
      data-category={goal.category}
      data-term={goal.term}
    >
      <div className="flex items-start gap-4">
        <ProgressRing value={progress.percent} size={64} stroke={5} tone={ringTone}>
          <span
            className="font-mono text-xs font-semibold tabular-nums"
            data-testid="goal-percent"
          >
            {progress.percent === null ? "—" : `${progress.percent}%`}
          </span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <h3
            className={`font-display font-semibold leading-snug tracking-tight ${
              goal.status === "done" ? "line-through" : ""
            }`}
          >
            {goal.title}
          </h3>
          {goal.description && (
            <p className="mt-1 text-sm text-muted">{goal.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill tone="neutral">{goal.category}</Pill>
            {inactive && (
              <Badge tone={GOAL_STATUS_TONE[goal.status]} dot>
                {goal.status}
              </Badge>
            )}
            {goal.targetDate && (
              <Pill tone={overdue ? "warn" : "neutral"}>
                {overdue ? "Overdue · " : ""}
                {formatShort(goal.targetDate)}
              </Pill>
            )}
            {ready && <Pill tone="done">ready to complete?</Pill>}
          </div>
        </div>
      </div>

      {/* Where the number came from. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-3 text-xs text-faint">
        {progress.kind === "roadmap" && goal.roadmapTally && (
          <>
            <Link
              href={`/roadmaps?r=${goal.roadmapTally.slug}`}
              className="font-medium text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:decoration-accent"
            >
              {goal.roadmapTally.name}
            </Link>
            <span className="font-mono tabular-nums">
              {goal.roadmapTally.done}/{goal.roadmapTally.total} topics
            </span>
          </>
        )}
        {progress.kind === "roadmap" && !goal.roadmapTally && (
          <span>Roadmap unavailable</span>
        )}
        {progress.kind === "milestones" && progress.detail && (
          <span className="font-mono tabular-nums">
            {progress.detail.done}/{progress.detail.total} milestones
          </span>
        )}
        {progress.kind === "manual" && <span>Manual</span>}
        {progress.orphanedFromRoadmap && (
          <Pill tone="warn">roadmap deleted — now manual</Pill>
        )}
      </div>

      {/* Slider only when it is actually what drives the number. */}
      {progress.kind === "manual" && goal.status === "active" && (
        <div className="mt-3">
          {/* Native control on purpose — `color-scheme: dark` already renders it
              dark, and `appearance-none` would take the thumb with it. */}
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={slider}
            aria-label="Manual progress"
            onChange={(e) => setSlider(Number(e.target.value))}
            onPointerUp={() => startTransition(() => setManualProgress(goal.id, slider))}
            onBlur={() => startTransition(() => setManualProgress(goal.id, slider))}
            className="w-full cursor-pointer accent-accent"
          />
        </div>
      )}

      {milestones.length > 0 && (
        <ul className="mt-3 space-y-0.5 border-t border-line pt-2">
          {milestones.map((m) => (
            <li key={m.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    toggleLocally(m.id);
                    await toggleMilestone(m.id);
                  })
                }
                className="flex flex-1 items-center gap-2.5 rounded py-1.5 text-left text-sm"
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    m.done
                      ? "border-done bg-done text-canvas"
                      : "border-line-strong"
                  }`}
                >
                  {m.done && <CheckMark className="h-2.5 w-2.5" />}
                </span>
                <span className={m.done ? "text-faint line-through" : ""}>
                  {m.title}
                </span>
              </button>
              {/* Always visible: a hover-only affordance is unreachable on touch. */}
              <button
                type="button"
                aria-label={`Delete milestone ${m.title}`}
                onClick={() => startTransition(() => deleteMilestone(m.id))}
                className="shrink-0 rounded px-1.5 py-1 text-xs text-faint transition-colors hover:text-warn"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
        {goal.status !== "done" && (
          <ActionButton onClick={() => setGoalStatus(goal.id, "done")} tone="done">
            Mark done
          </ActionButton>
        )}
        {goal.status !== "dropped" && (
          <ActionButton onClick={() => setGoalStatus(goal.id, "dropped")}>
            Drop
          </ActionButton>
        )}
        {goal.status !== "active" && (
          <ActionButton onClick={() => setGoalStatus(goal.id, "active")} tone="accent">
            Reactivate
          </ActionButton>
        )}
        <TextButton onClick={() => setEditing((v) => !v)}>
          {editing ? "Close" : "Edit"}
        </TextButton>
        {/* Accessible name must stay exactly "Delete" — "Delete milestone …"
            buttons live in the same card. */}
        <ActionButton
          onClick={async () => {
            await deleteGoal(goal.id);
            toast("Goal deleted", "warn");
          }}
          tone="warn"
        >
          Delete
        </ActionButton>
      </div>

      {editing && <EditPanel goal={goal} />}
    </Card>
  );
}

function ActionButton({
  children,
  onClick,
  tone = "neutral",
}: {
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
  tone?: Tone;
}) {
  return (
    <TextButton
      tone={tone}
      onClick={() =>
        startTransition(async () => {
          await onClick();
        })
      }
    >
      {children}
    </TextButton>
  );
}

function EditPanel({ goal }: { goal: GoalNode }) {
  const [state, action] = useActionState<FormState, FormData>(updateGoal, {});
  const [msState, msAction] = useActionState<FormState, FormData>(addMilestone, {});
  const [term, setTerm] = useState<GoalTerm>(goal.term);

  return (
    <div className="mt-3 space-y-4 border-t border-line pt-3">
      <form action={action} className="space-y-2">
        <input type="hidden" name="id" value={goal.id} />
        <Input name="title" defaultValue={goal.title} required aria-label="Title" />
        <Input
          name="description"
          defaultValue={goal.description ?? ""}
          placeholder="Description (optional)"
          aria-label="Description"
        />
        <div className="flex gap-2">
          <Input
            name="category"
            list="goal-categories"
            defaultValue={goal.category}
            required
            aria-label="Category"
            className="min-w-0 flex-1"
          />
          {/* Wrapped, not widthed directly — `Select` carries `w-full` from
              the shared kit, and a same-element `w-36` can lose that fight
              depending on Tailwind's generated rule order. */}
          <div className="w-36 shrink-0">
            <Select
              name="term"
              value={term}
              onChange={(e) => setTerm(e.target.value as GoalTerm)}
              aria-label="Term"
            >
              <option value="short">Short-term</option>
              <option value="long">Long-term</option>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            name="targetDate"
            type="date"
            defaultValue={goal.targetDate ?? ""}
            aria-label="Target date"
            className="min-w-0 flex-1"
          />
          {/* No onClick here: closing the panel would unmount the form
              mid-submit and cancel the action. */}
          <Button type="submit" variant="primary" className="shrink-0">
            Save
          </Button>
        </div>
        {state.error && (
          <p role="alert" className="text-xs text-warn">
            {state.error}
          </p>
        )}
      </form>

      {goal.progressSource !== "roadmap" || goal.roadmapId === null ? (
        <form action={msAction} className="space-y-2">
          <input type="hidden" name="goalId" value={goal.id} />
          <div className="flex gap-2">
            <Input
              name="title"
              required
              placeholder="Add milestone"
              aria-label="New milestone"
            />
            <Button type="submit" className="shrink-0">
              Add
            </Button>
          </div>
          {msState.error && (
            <p role="alert" className="text-xs text-warn">
              {msState.error}
            </p>
          )}
        </form>
      ) : (
        <p className="text-xs text-faint">
          Progress comes from the linked roadmap, so milestones are not used here.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

function AddGoalForm({
  roadmaps,
  categories,
}: {
  roadmaps: { id: number; name: string }[];
  categories: string[];
}) {
  const [state, action] = useActionState<FormState, FormData>(addGoal, {});
  const [source, setSource] = useState<"manual" | "roadmap">("manual");
  const [term, setTerm] = useState<GoalTerm>("short");

  return (
    <Disclosure label="+ Add goal" className="mt-4">
      {/* One datalist for the whole page — every category input points at this
          id, so it must not be duplicated per card. */}
      <datalist id="goal-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <form
        action={action}
        data-testid="add-goal-form"
        className="max-w-xl space-y-3"
      >
        <Input name="title" required placeholder="Goal title" aria-label="Goal title" />
        <Input
          name="description"
          placeholder="Description (optional)"
          aria-label="Description"
        />
        <div className="flex gap-2">
          <Field label="Category" className="min-w-0 flex-1">
            <Input
              name="category"
              list="goal-categories"
              required
              placeholder="e.g. Career, Health, Finance"
            />
          </Field>
          <Field label="Term" className="w-36 shrink-0">
            <Select
              name="term"
              value={term}
              onChange={(e) => setTerm(e.target.value as GoalTerm)}
              required
            >
              <option value="short">Short-term</option>
              <option value="long">Long-term</option>
            </Select>
          </Field>
        </div>
        <Field label="Target date (optional)">
          <Input name="targetDate" type="date" />
        </Field>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-medium text-muted">
            Progress from
          </legend>
          <div className="flex gap-2">
            {(["manual", "roadmap"] as const).map((opt) => (
              <label
                key={opt}
                className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                  source === opt
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line text-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="progressSource"
                  value={opt}
                  checked={source === opt}
                  onChange={() => setSource(opt)}
                  className="sr-only"
                />
                {opt === "manual" ? "Manual" : "Track a roadmap"}
              </label>
            ))}
          </div>
        </fieldset>

        {source === "roadmap" ? (
          roadmaps.length === 0 ? (
            <p className="text-xs text-warn">
              No roadmaps exist yet — create one on the Roadmaps tab first.
            </p>
          ) : (
            <Select name="roadmapId" required defaultValue="" aria-label="Roadmap">
              <option value="" disabled>
                Pick a roadmap…
              </option>
              {roadmaps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          )
        ) : (
          <Field
            label="Milestones (optional, one per line)"
            hint="Milestones override the slider whenever any exist."
          >
            <Textarea
              name="milestones"
              rows={3}
              placeholder={"Read chapter 1\nBuild a demo"}
            />
          </Field>
        )}

        <Button type="submit" variant="primary" size="lg">
          Create goal
        </Button>
        {state.error && (
          <p role="alert" className="text-xs text-warn">
            {state.error}
          </p>
        )}
      </form>
    </Disclosure>
  );
}
