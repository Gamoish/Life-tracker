"use client";

import { useActionState } from "react";
import { Button, Card, Field, Input, ProgressBar, Select } from "@/components/ui";
import { IconDroplet, IconScale } from "@/components/icons";
import { useToast } from "@/components/Toast";
import type { WeightUnit } from "@/lib/weight-unit";
import { saveWater, saveWeight, type FormState } from "../settings/actions";

/**
 * The two targets that shape the rest of this page — the daily water goal (which
 * drives every water progress bar) and the weight unit (which drives every
 * weight readout) — editable right here rather than only buried in Settings.
 *
 * Reuses the exact `saveWater`/`saveWeight` server actions Settings uses, so a
 * change made here and one made there are the same write. Buttons read "Update"
 * (not "Save") deliberately, so the metrics form below stays the page's only
 * "Save" button.
 */
export default function HealthTargets({
  bottleSizeMl,
  dailyWaterGoalMl,
  weightUnit,
  waterMl,
}: {
  bottleSizeMl: number;
  dailyWaterGoalMl: number;
  weightUnit: WeightUnit;
  waterMl: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <WaterGoalCard bottleSizeMl={bottleSizeMl} dailyWaterGoalMl={dailyWaterGoalMl} waterMl={waterMl} />
      <WeightUnitCard weightUnit={weightUnit} />
    </div>
  );
}

function WaterGoalCard({
  bottleSizeMl,
  dailyWaterGoalMl,
  waterMl,
}: {
  bottleSizeMl: number;
  dailyWaterGoalMl: number;
  waterMl: number;
}) {
  const toast = useToast();
  const [state, action] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await saveWater(prev, formData);
    if (result.ok) toast("Water goal updated", "accent");
    return result;
  }, {});

  const pct = dailyWaterGoalMl > 0 ? (waterMl / dailyWaterGoalMl) * 100 : 0;

  return (
    <Card className="p-4">
      <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold tracking-tight">
        <IconDroplet className="h-4 w-4 text-accent" filled />
        Daily water goal
      </h3>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-2xs text-faint">Today so far</span>
        <span className="font-mono text-2xs tabular-nums text-faint">
          {waterMl} / {dailyWaterGoalMl} ml
        </span>
      </div>
      <ProgressBar value={pct} tone={waterMl >= dailyWaterGoalMl ? "done" : "accent"} className="mt-1.5" />
      <form action={action} className="mt-3 flex items-end gap-2">
        <input type="hidden" name="bottleSizeMl" value={bottleSizeMl} />
        <Field label="Goal (ml)" className="min-w-0 flex-1">
          <Input
            name="dailyWaterGoalMl"
            type="number"
            min={1}
            defaultValue={dailyWaterGoalMl}
            aria-label="Daily water goal in ml"
          />
        </Field>
        <Button type="submit" variant="primary" className="shrink-0">
          Update
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

function WeightUnitCard({ weightUnit }: { weightUnit: WeightUnit }) {
  const toast = useToast();
  const [state, action] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await saveWeight(prev, formData);
    if (result.ok) toast("Weight unit updated", "accent");
    return result;
  }, {});

  return (
    <Card className="p-4">
      <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold tracking-tight">
        <IconScale className="h-4 w-4 text-accent" />
        Weight unit
      </h3>
      <p className="mt-1 text-2xs text-faint">Weight is always stored in kg — this only changes how it&apos;s shown.</p>
      <form action={action} className="mt-3 flex items-end gap-2">
        <Field label="Unit" className="min-w-0 flex-1">
          <Select name="weightUnit" defaultValue={weightUnit} aria-label="Weight unit">
            <option value="kg">Kilograms (kg)</option>
            <option value="lbs">Pounds (lbs)</option>
          </Select>
        </Field>
        <Button type="submit" variant="primary" className="shrink-0">
          Update
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
