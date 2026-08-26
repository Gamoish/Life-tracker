"use client";

import { startTransition, useActionState, useState } from "react";
import {
  Button,
  Card,
  Disclosure,
  EmptyState,
  Field,
  Input,
  Pill,
  StatTile,
  TextButton,
} from "@/components/ui";
import { IconAdd, IconDroplet, IconFlame, IconMoon, IconScale } from "@/components/icons";
import WeightChart from "@/components/WeightChart";
import { formatShort } from "@/lib/date";
import { formatDuration } from "@/lib/sleep";
import { formatWeight, type WeightUnit } from "@/lib/weight-unit";
import type {
  FoodDayHistory,
  MealType,
  SleepHistoryEntry,
  WaterDayHistory,
  WeightHistoryEntry,
} from "@/lib/health-queries";
import {
  addWorkout,
  clearMetric,
  deleteFood,
  deleteWater,
  deleteWorkout,
  editWorkout,
  saveMetrics,
  type FormState,
} from "./actions";

export type WorkoutEntry = {
  id: number;
  date: string;
  type: string;
  durationMin: number;
  notes: string | null;
};

export type Metrics = {
  steps: number | null;
  weightKg: number | null;
};

export type WeekSummary = { count: number; totalMinutes: number };

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** The heavier management surface: precise metric entry/clearing, workout/sleep/water/food history. */
export default function HealthManager({
  metrics,
  workouts,
  workoutStreak,
  weekSummary,
  sleepHistory,
  foodHistory,
  weightHistory,
  waterHistory,
  weightUnit,
}: {
  metrics: Metrics;
  workouts: WorkoutEntry[];
  workoutStreak: number;
  weekSummary: WeekSummary;
  sleepHistory: SleepHistoryEntry[];
  foodHistory: FoodDayHistory[];
  weightHistory: WeightHistoryEntry[];
  waterHistory: WaterDayHistory[];
  weightUnit: WeightUnit;
}) {
  return (
    <div className="space-y-6">
      <MetricsForm metrics={metrics} />
      <WeightTrendSection history={weightHistory} weightUnit={weightUnit} />
      <WorkoutSection workouts={workouts} workoutStreak={workoutStreak} weekSummary={weekSummary} />
      <SleepHistorySection history={sleepHistory} />
      <WaterHistorySection history={waterHistory} />
      <FoodHistorySection history={foodHistory} />
    </div>
  );
}

function MetricsForm({ metrics }: { metrics: Metrics }) {
  const [state, action] = useActionState<FormState, FormData>(saveMetrics, {});

  return (
    <Card className="p-4">
      <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">
        Steps, weight
      </h3>
      <form action={action} className="grid gap-2 sm:grid-cols-2">
        <MetricField
          name="steps"
          label="Steps"
          defaultValue={metrics.steps}
          field="steps"
        />
        <MetricField
          name="weightKg"
          label="Weight (kg)"
          defaultValue={metrics.weightKg}
          field="weightKg"
          step="0.1"
        />
        <Button type="submit" variant="primary" className="sm:col-span-2">
          Save
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="mt-1.5 text-xs text-warn">
          {state.error}
        </p>
      )}
    </Card>
  );
}

function MetricField({
  name,
  label,
  defaultValue,
  field,
  step,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
  field: "steps" | "weightKg";
  step?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-1.5">
        <Input
          name={name}
          type="number"
          min={0}
          step={step}
          defaultValue={defaultValue ?? ""}
          placeholder="—"
          aria-label={label}
          className="min-w-0 flex-1"
        />
        {defaultValue !== null && (
          <TextButton
            tone="warn"
            data-testid={`clear-${field}`}
            onClick={() => startTransition(() => clearMetric(field))}
          >
            ✕
          </TextButton>
        )}
      </div>
    </Field>
  );
}

function WorkoutSection({
  workouts,
  workoutStreak,
  weekSummary,
}: {
  workouts: WorkoutEntry[];
  workoutStreak: number;
  weekSummary: WeekSummary;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold tracking-tight">Workouts</h3>
        <dl className="flex gap-2">
          <div data-testid="workout-streak-tile" data-value={workoutStreak}>
            <StatTile
              label="Streak"
              value={`${workoutStreak}d`}
              tone={workoutStreak > 0 ? "done" : "neutral"}
              icon={<IconFlame />}
              className="px-3 py-2"
            />
          </div>
          <div data-testid="workout-week-tile" data-value={weekSummary.totalMinutes}>
            <StatTile
              label="This week"
              value={weekSummary.totalMinutes}
              hint={`${weekSummary.count} session${weekSummary.count === 1 ? "" : "s"}`}
              className="px-3 py-2"
            />
          </div>
        </dl>
      </div>

      {workouts.length === 0 ? (
        <EmptyState icon={<IconAdd />} title="No workouts logged yet" className="mb-3" />
      ) : (
        <ul className="mb-3 space-y-2">
          {workouts.map((w) => (
            <WorkoutRow key={w.id} workout={w} />
          ))}
        </ul>
      )}

      <AddWorkoutForm />
    </div>
  );
}

function WorkoutRow({ workout }: { workout: WorkoutEntry }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(editWorkout, {});

  return (
    <Card className="p-3" data-testid="workout-row" data-type={workout.type} data-date={workout.date}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{workout.type}</p>
            <Pill tone="neutral">{formatShort(workout.date)}</Pill>
          </div>
          <p className="mt-0.5 font-mono text-2xs text-faint">
            {workout.durationMin} min{workout.notes ? ` · ${workout.notes}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <TextButton onClick={() => setEditing((v) => !v)}>
            {editing ? "Close" : "Edit"}
          </TextButton>
          <TextButton
            tone="warn"
            data-testid="delete-workout"
            onClick={() => startTransition(() => deleteWorkout(workout.id))}
          >
            Delete
          </TextButton>
        </div>
      </div>

      {editing && (
        <form action={action} className="mt-3 space-y-2 border-t border-line pt-3">
          <input type="hidden" name="id" value={workout.id} />
          <input type="hidden" name="date" value={workout.date} />
          <div className="flex gap-2">
            <Input name="type" defaultValue={workout.type} required aria-label="Type" className="min-w-0 flex-1" />
            {/* Wrapped, not widthed directly — see the note in HealthToday. */}
            <div className="w-24 shrink-0">
              <Input
                name="durationMin"
                type="number"
                min={1}
                defaultValue={workout.durationMin}
                required
                aria-label="Duration (minutes)"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              name="notes"
              defaultValue={workout.notes ?? ""}
              placeholder="Notes (optional)"
              aria-label="Notes"
              className="min-w-0 flex-1"
            />
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
      )}
    </Card>
  );
}

function AddWorkoutForm() {
  const [state, action] = useActionState<FormState, FormData>(addWorkout, {});

  return (
    <Disclosure label="+ Add workout">
      <form action={action} data-testid="add-workout-form" className="max-w-xl space-y-2">
        <div className="flex gap-2">
          <Input name="type" required placeholder="e.g. Running" aria-label="Type" className="min-w-0 flex-1" />
          {/* Wrapped, not widthed directly — see the note in HealthToday. */}
          <div className="w-24 shrink-0">
            <Input
              name="durationMin"
              type="number"
              min={1}
              required
              placeholder="min"
              aria-label="Duration (minutes)"
            />
          </div>
        </div>
        <Input name="notes" placeholder="Notes (optional)" aria-label="Notes" />
        <p className="text-2xs text-faint">Logs today — edit a past entry from the list above.</p>
        <Button type="submit" variant="primary" size="lg">
          Add workout
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

function WeightTrendSection({
  history,
  weightUnit,
}: {
  history: WeightHistoryEntry[];
  weightUnit: WeightUnit;
}) {
  // `history` arrives newest-first (for the list below); the chart wants
  // oldest-first so it reads left-to-right.
  const chartPoints = [...history].reverse();

  return (
    <div>
      <h3 className="mb-2 font-display text-sm font-semibold tracking-tight">Weight trend</h3>
      {history.length === 0 ? (
        <EmptyState icon={<IconScale />} title="No weight logged yet" />
      ) : (
        <Card className="p-4">
          <WeightChart points={chartPoints} unit={weightUnit} className="mb-3" />
          <ul className="space-y-1">
            {history.map((h) => (
              <li
                key={h.date}
                data-testid="weight-history-row"
                data-date={h.date}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <Pill tone="neutral">{formatShort(h.date)}</Pill>
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {formatWeight(h.weightKg, weightUnit)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function WaterHistorySection({ history }: { history: WaterDayHistory[] }) {
  return (
    <div>
      <h3 className="mb-2 font-display text-sm font-semibold tracking-tight">Water history</h3>
      {history.length === 0 ? (
        <EmptyState icon={<IconDroplet />} title="No water logged yet" />
      ) : (
        <ul className="space-y-2">
          {history.map((day) => (
            <Card key={day.date} className="p-3" data-testid="water-history-day" data-date={day.date}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <Pill tone="neutral">{formatShort(day.date)}</Pill>
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {day.totalMl} ml
                </span>
              </div>
              <ul className="space-y-1">
                {day.entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span>{e.amountMl} ml</span>
                    <TextButton
                      tone="warn"
                      data-testid="delete-water"
                      onClick={() => startTransition(() => deleteWater(e.id))}
                    >
                      ✕
                    </TextButton>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}

function SleepHistorySection({ history }: { history: SleepHistoryEntry[] }) {
  return (
    <div>
      <h3 className="mb-2 font-display text-sm font-semibold tracking-tight">Sleep history</h3>
      {history.length === 0 ? (
        <EmptyState icon={<IconMoon />} title="No nights logged yet" />
      ) : (
        <ul className="space-y-1.5">
          {history.map((s) => (
            <li
              key={s.date}
              data-testid="sleep-history-row"
              data-date={s.date}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3.5 py-2"
            >
              <span className="flex items-center gap-2 text-sm">
                <Pill tone="neutral">{formatShort(s.date)}</Pill>
                <span className="font-mono text-2xs tabular-nums text-faint">
                  {s.bedTime.slice(0, 5)} → {s.wakeTime.slice(0, 5)}
                </span>
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {formatDuration(s.durationMin)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FoodHistorySection({ history }: { history: FoodDayHistory[] }) {
  return (
    <div>
      <h3 className="mb-2 font-display text-sm font-semibold tracking-tight">Food history</h3>
      {history.length === 0 ? (
        <EmptyState icon={<IconFlame />} title="No food logged yet" />
      ) : (
        <ul className="space-y-2">
          {history.map((day) => (
            <Card key={day.date} className="p-3" data-testid="food-history-day" data-date={day.date}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <Pill tone="neutral">{formatShort(day.date)}</Pill>
                <span className="font-mono text-xs font-semibold tabular-nums">
                  {day.totalCalories} cal
                </span>
              </div>
              <ul className="space-y-1">
                {day.items.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span className="min-w-0 truncate">
                      {f.item}
                      {f.meal && <span className="ml-1.5 text-faint">· {MEAL_LABEL[f.meal]}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-mono tabular-nums text-faint">{f.calories ?? "—"}</span>
                      <TextButton
                        tone="warn"
                        data-testid="delete-food-history"
                        onClick={() => startTransition(() => deleteFood(f.id))}
                      >
                        ✕
                      </TextButton>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
