"use client";

import { startTransition, useActionState, useOptimistic } from "react";
import { Button, EmptyState, Input, ProgressBar, Select, TextButton } from "@/components/ui";
import { IconAdd, IconDroplet, IconScale } from "@/components/icons";
import { formatWeight, toDisplay, type WeightUnit } from "@/lib/weight-unit";
import {
  addFood,
  deleteFood,
  logWaterBottle,
  logWaterCustom,
  logWeight,
  saveSleep,
  type FormState,
} from "./actions";
import type { MealType } from "@/lib/health-queries";

export type FoodEntry = { id: number; item: string; calories: number | null; meal: MealType | null };
export type SleepEntry = { bedTime: string; wakeTime: string; durationMin: number };

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/**
 * The taps that don't deserve a trip through a full form: a bottle/custom water
 * log, a weight entry, logging sleep, logging a food item — plus today's food
 * list. Props-only and self-contained, so the Health page can drop it straight
 * into its "log today" section. The at-a-glance summary tiles live at the page
 * level now (see `health/page.tsx`), so this is purely the interactive logging.
 */
export default function HealthToday({
  weightKg,
  waterMl,
  calories,
  calorieGoal,
  food,
  sleep,
  bottleSizeMl,
  dailyWaterGoalMl,
  weightUnit,
}: {
  weightKg: number | null;
  waterMl: number;
  calories: number;
  calorieGoal: number | null;
  food: FoodEntry[];
  sleep: SleepEntry | null;
  bottleSizeMl: number;
  dailyWaterGoalMl: number;
  weightUnit: WeightUnit;
}) {
  return (
    <div className="space-y-4">
      <WaterBox waterMl={waterMl} bottleSizeMl={bottleSizeMl} dailyWaterGoalMl={dailyWaterGoalMl} />

      {calorieGoal !== null && (
        <div className="rounded-card border border-line bg-surface px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Calorie goal</span>
            <span className="font-mono text-2xs tabular-nums text-faint">
              {calories} / {calorieGoal} cal
            </span>
          </div>
          <ProgressBar
            value={(calories / calorieGoal) * 100}
            tone={calories > calorieGoal ? "warn" : "accent"}
            className="mt-2.5"
          />
        </div>
      )}

      <WeightQuickLog weightKg={weightKg} weightUnit={weightUnit} />

      <SleepQuickLog sleep={sleep} />

      <FoodQuickAdd food={food} />
    </div>
  );
}

/**
 * A bottle tap logs the configured size in one round trip (optimistic, same
 * frequent-tap treatment the old +1/-1 glass buttons had); a custom amount
 * goes through a small form instead since it needs the typed value validated
 * before it can be optimistic about anything.
 */
function WaterBox({
  waterMl,
  bottleSizeMl,
  dailyWaterGoalMl,
}: {
  waterMl: number;
  bottleSizeMl: number;
  dailyWaterGoalMl: number;
}) {
  const [optimisticMl, adjustMl] = useOptimistic(
    waterMl,
    (state: number, delta: number) => Math.max(0, state + delta),
  );
  const [state, action] = useActionState<FormState, FormData>(logWaterCustom, {});

  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <IconDroplet className="h-4 w-4 text-accent" filled />
            Water
          </span>
          <span
            className="font-mono text-2xs tabular-nums text-faint"
            data-testid="water-total"
          >
            {optimisticMl} / {dailyWaterGoalMl} ml
          </span>
        </span>
        <Button
          variant="primary"
          size="sm"
          className="shrink-0"
          data-testid="water-bottle"
          onClick={() =>
            startTransition(async () => {
              adjustMl(bottleSizeMl);
              await logWaterBottle(bottleSizeMl);
            })
          }
        >
          +1 bottle ({bottleSizeMl}ml)
        </Button>
      </div>

      <ProgressBar
        value={(optimisticMl / dailyWaterGoalMl) * 100}
        tone={optimisticMl >= dailyWaterGoalMl ? "done" : "accent"}
        className="mt-3"
      />

      <form action={action} className="mt-3 flex items-end gap-2">
        <div className="w-28 shrink-0">
          <Input
            name="amountMl"
            type="number"
            min={1}
            placeholder="Custom ml"
            aria-label="Custom water amount in ml"
            data-testid="water-custom-input"
          />
        </div>
        <Button type="submit" size="sm" data-testid="water-custom-submit">
          Log amount
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="mt-1.5 text-xs text-warn">
          {state.error}
        </p>
      )}
    </div>
  );
}

/** Prefilled with today's value (converted to the display unit) when there is one, so re-logging edits rather than re-guesses — same framing as `SleepQuickLog`. */
function WeightQuickLog({
  weightKg,
  weightUnit,
}: {
  weightKg: number | null;
  weightUnit: WeightUnit;
}) {
  const [state, action] = useActionState<FormState, FormData>(logWeight, {});

  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3" data-testid="weight-quick-log">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <IconScale className="h-4 w-4 text-accent" />
          Weight
        </span>
        {weightKg !== null && (
          <span className="font-mono text-2xs tabular-nums text-faint">
            {formatWeight(weightKg, weightUnit)}
          </span>
        )}
      </div>
      <form action={action} className="mt-2.5 flex items-end gap-2">
        <input type="hidden" name="unit" value={weightUnit} />
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-2xs text-faint">Weight ({weightUnit})</span>
          <Input
            name="weight"
            type="number"
            min={0}
            step="0.1"
            defaultValue={weightKg !== null ? toDisplay(weightKg, weightUnit).toFixed(1) : ""}
            aria-label={`Weight in ${weightUnit}`}
          />
        </label>
        <Button type="submit" variant="primary" className="shrink-0" data-testid="weight-log-submit">
          Log
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="mt-1.5 text-xs text-warn">
          {state.error}
        </p>
      )}
    </div>
  );
}

/**
 * Bed/wake time, defaulted to last-night's typical window so logging is
 * usually just a tap on "Log" — same "quick-log alongside a running total"
 * framing as the water box above. Already-logged tonight pre-fills the exact
 * values instead, so re-opening it edits rather than re-guesses.
 */
function SleepQuickLog({ sleep }: { sleep: SleepEntry | null }) {
  const [state, action] = useActionState<FormState, FormData>(saveSleep, {});

  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3" data-testid="sleep-quick-log">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Sleep</span>
        {sleep && (
          <span className="font-mono text-2xs tabular-nums text-faint">
            {sleep.bedTime.slice(0, 5)} → {sleep.wakeTime.slice(0, 5)}
          </span>
        )}
      </div>
      <form action={action} className="mt-2.5 flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-2xs text-faint">Bed time</span>
          <Input
            name="bedTime"
            type="time"
            required
            defaultValue={sleep?.bedTime.slice(0, 5) ?? "23:00"}
            aria-label="Bed time"
          />
        </label>
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-2xs text-faint">Wake time</span>
          <Input
            name="wakeTime"
            type="time"
            required
            defaultValue={sleep?.wakeTime.slice(0, 5) ?? "07:00"}
            aria-label="Wake time"
          />
        </label>
        <Button type="submit" variant="primary" className="shrink-0" data-testid="sleep-log-submit">
          Log
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="mt-1.5 text-xs text-warn">
          {state.error}
        </p>
      )}
    </div>
  );
}

function FoodQuickAdd({ food }: { food: FoodEntry[] }) {
  const [state, action] = useActionState<FormState, FormData>(addFood, {});

  return (
    <div className="rounded-card border border-line bg-surface p-3.5">
      <p className="mb-2 text-sm font-medium">Food today</p>

      {food.length === 0 ? (
        <EmptyState icon={<IconAdd />} title="Nothing logged yet" className="py-6" />
      ) : (
        <ul className="mb-3 space-y-1">
          {food.map((f) => (
            <li
              key={f.id}
              data-testid="food-entry"
              data-item={f.item}
              className="flex items-center justify-between gap-2 rounded-lg bg-raised px-3 py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">
                {f.item}
                {f.meal && <span className="ml-1.5 text-2xs text-faint">· {MEAL_LABEL[f.meal]}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-mono text-2xs tabular-nums text-faint">
                  {f.calories ?? "—"} cal
                </span>
                <TextButton
                  tone="warn"
                  data-testid="delete-food"
                  onClick={() => startTransition(() => deleteFood(f.id))}
                >
                  ✕
                </TextButton>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form action={action} data-testid="quick-add-food-form" className="space-y-2">
        <Input
          name="item"
          required
          placeholder="e.g. Chicken salad"
          aria-label="Food item"
        />
        <div className="flex gap-2">
          {/* Wrapped rather than widthed directly: shared kit controls carry
              `w-full`, and a same-element width class loses that cascade
              fight depending on Tailwind's generated rule order. */}
          <div className="min-w-0 flex-1">
            <Select name="meal" aria-label="Meal" defaultValue="">
              <option value="">Meal (optional)</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </Select>
          </div>
          <div className="w-20 shrink-0">
            <Input
              name="calories"
              type="number"
              min={0}
              placeholder="cal"
              aria-label="Calories"
            />
          </div>
          <Button type="submit" variant="primary" className="shrink-0">
            Log
          </Button>
        </div>
      </form>
      {state.error && (
        <p role="alert" className="mt-1.5 text-xs text-warn">
          {state.error}
        </p>
      )}
    </div>
  );
}
