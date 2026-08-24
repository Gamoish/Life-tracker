"use client";

import { useActionState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";
import type { WeightUnit } from "@/lib/weight-unit";
import { saveSettings, saveWater, saveWeight, type FormState } from "./actions";
import type { Settings } from "./queries";

/** Props-only, self-contained — same contract as every other module's View. */
export default function SettingsView({ settings }: { settings: Settings }) {
  return (
    <div className="space-y-6">
      <CalorieGoalCard calorieGoal={settings.calorieGoal} />
      <WaterSettingsCard
        bottleSizeMl={settings.bottleSizeMl}
        dailyWaterGoalMl={settings.dailyWaterGoalMl}
      />
      <WeightSettingsCard weightUnit={settings.weightUnit} />

      <Card className="flex items-center justify-between gap-4 p-4">
        <div>
          <h3 className="mb-1 font-display text-sm font-semibold tracking-tight">Appearance</h3>
          <p className="text-xs text-muted">Switch between the dark and light theme.</p>
        </div>
        <ThemeToggle />
      </Card>

      <Card className="p-4">
        <h3 className="mb-1 font-display text-sm font-semibold tracking-tight">Export data</h3>
        <p className="mb-3 text-xs text-muted">
          Every task, habit, goal, roadmap, expense, health log and journal entry, as one JSON
          file — a personal backup, not a report.
        </p>
        <a
          href="/api/export"
          download
          data-testid="export-data-link"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-raised"
        >
          Download JSON export
        </a>
      </Card>
    </div>
  );
}

function CalorieGoalCard({ calorieGoal }: { calorieGoal: number | null }) {
  const [state, action] = useActionState<FormState, FormData>(saveSettings, {});

  return (
    <Card className="p-4">
      <h3 className="mb-1 font-display text-sm font-semibold tracking-tight">
        Daily calorie goal
      </h3>
      <p className="mb-3 text-xs text-muted">
        Drives the progress indicator on today&apos;s food log. Leave blank to hide it.
      </p>
      <form action={action} className="flex max-w-xs items-end gap-2">
        <Field label="Calories / day" className="flex-1">
          <Input
            name="calorieGoal"
            type="number"
            min={1}
            defaultValue={calorieGoal ?? ""}
            placeholder="e.g. 2000"
            aria-label="Daily calorie goal"
          />
        </Field>
        <Button type="submit" variant="primary" data-testid="save-calorie-goal">
          Save
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="mt-1.5 text-xs text-warn">
          {state.error}
        </p>
      )}
      {state.ok && <p className="mt-1.5 text-xs text-done">Saved.</p>}
    </Card>
  );
}

function WaterSettingsCard({
  bottleSizeMl,
  dailyWaterGoalMl,
}: {
  bottleSizeMl: number;
  dailyWaterGoalMl: number;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveWater, {});

  return (
    <Card className="p-4">
      <h3 className="mb-1 font-display text-sm font-semibold tracking-tight">Water</h3>
      <p className="mb-3 text-xs text-muted">
        Bottle size drives the one-tap water log; the daily goal drives its progress bar.
      </p>
      <form action={action} className="flex max-w-sm flex-wrap items-end gap-2">
        <Field label="Bottle size (ml)" className="min-w-0 flex-1">
          <Input
            name="bottleSizeMl"
            type="number"
            min={1}
            defaultValue={bottleSizeMl}
            aria-label="Bottle size in ml"
          />
        </Field>
        <Field label="Daily goal (ml)" className="min-w-0 flex-1">
          <Input
            name="dailyWaterGoalMl"
            type="number"
            min={1}
            defaultValue={dailyWaterGoalMl}
            aria-label="Daily water goal in ml"
          />
        </Field>
        <Button type="submit" variant="primary" data-testid="save-water-settings">
          Save
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="mt-1.5 text-xs text-warn">
          {state.error}
        </p>
      )}
      {state.ok && <p className="mt-1.5 text-xs text-done">Saved.</p>}
    </Card>
  );
}

function WeightSettingsCard({ weightUnit }: { weightUnit: WeightUnit }) {
  const [state, action] = useActionState<FormState, FormData>(saveWeight, {});

  return (
    <Card className="p-4">
      <h3 className="mb-1 font-display text-sm font-semibold tracking-tight">Weight</h3>
      <p className="mb-3 text-xs text-muted">
        Weight is always stored in kg; this only changes how it's entered and displayed.
      </p>
      <form action={action} className="flex max-w-xs items-end gap-2">
        <Field label="Unit" className="flex-1">
          <Select name="weightUnit" defaultValue={weightUnit} aria-label="Weight unit">
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
          </Select>
        </Field>
        <Button type="submit" variant="primary" data-testid="save-weight-unit">
          Save
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="mt-1.5 text-xs text-warn">
          {state.error}
        </p>
      )}
      {state.ok && <p className="mt-1.5 text-xs text-done">Saved.</p>}
    </Card>
  );
}
