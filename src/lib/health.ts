/**
 * Daily health rollups.
 *
 * Pure and DB-free, like `habit-streak.ts` and `goal-progress.ts`: it takes
 * plain rows and returns numbers, so the `/health` page, the Today dashboard
 * and any optimistic client update all produce the IDENTICAL total from one
 * function rather than each re-implementing the sum.
 *
 * Phase 1 is logging only — there are deliberately no targets, deficits or
 * recommendations here. Nothing in this file judges a number, it only adds
 * them up.
 */

export type CalorieEntry = { calories: number | null };
export type DurationEntry = { durationMin: number };

/** Rows are already filtered to one day by the caller; this never sees a date. */
export type DayInput = {
  steps: number | null;
  weightKg: number | null;
  waterMl: number;
  food: readonly CalorieEntry[];
  workouts: readonly DurationEntry[];
};

export type DaySummary = {
  steps: number | null;
  weightKg: number | null;
  waterMl: number;
  calories: number;
  workoutMinutes: number;
  /** Entry counts, so a list can render "3 items" without re-walking the rows. */
  foodCount: number;
  workoutCount: number;
};

/** Coerces anything non-numeric to 0 so one bad row can't turn a total into NaN. */
function safe(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * Today's calories.
 *
 * A null-calorie entry counts as 0: you logged "coffee" without knowing the
 * number, and that must not remove the entry from the list or blank out the
 * total. The sum is therefore always a number, never null.
 */
export function totalCalories(entries: Iterable<CalorieEntry>): number {
  let total = 0;
  for (const entry of entries) total += safe(entry.calories);
  return total;
}

/** Minutes trained today, across every workout row. */
export function totalWorkoutMinutes(entries: Iterable<DurationEntry>): number {
  let total = 0;
  for (const entry of entries) total += safe(entry.durationMin);
  return total;
}

/** One call for everything the Today card shows. */
export function summarizeDay(input: DayInput): DaySummary {
  return {
    steps: input.steps,
    weightKg: input.weightKg,
    waterMl: Math.max(0, safe(input.waterMl)),
    calories: totalCalories(input.food),
    workoutMinutes: totalWorkoutMinutes(input.workouts),
    foodCount: input.food.length,
    workoutCount: input.workouts.length,
  };
}
