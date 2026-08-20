import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";
import type { WeightUnit } from "@/lib/weight-unit";

export type Settings = {
  calorieGoal: number | null;
  lastBmi: number | null;
  bottleSizeMl: number;
  dailyWaterGoalMl: number;
  weightUnit: WeightUnit;
};

/** The row's own defaults (see `appSettings` in `src/db/schema.ts`) — used
    whenever no row has been saved yet, so reading never has to create one. */
const DEFAULTS: Settings = {
  calorieGoal: null,
  lastBmi: null,
  bottleSizeMl: 500,
  dailyWaterGoalMl: 2500,
  weightUnit: "kg",
};

/**
 * A single settings row, id always 1 — enforced here in code rather than a DB
 * constraint. Reading never creates the row (nothing to save yet is a valid
 * state, distinct from "saved as blank"); saving upserts it into existence.
 */
export async function getSettings(): Promise<Settings> {
  const rows = await db
    .select({
      calorieGoal: appSettings.calorieGoal,
      lastBmi: appSettings.lastBmi,
      bottleSizeMl: appSettings.bottleSizeMl,
      dailyWaterGoalMl: appSettings.dailyWaterGoalMl,
      weightUnit: appSettings.weightUnit,
    })
    .from(appSettings)
    .where(eq(appSettings.id, 1));
  return rows[0] ?? DEFAULTS;
}

export async function saveCalorieGoal(calorieGoal: number | null) {
  await db
    .insert(appSettings)
    .values({ id: 1, calorieGoal })
    .onConflictDoUpdate({ target: appSettings.id, set: { calorieGoal } });
}

export async function saveLastBmi(lastBmi: number) {
  await db
    .insert(appSettings)
    .values({ id: 1, lastBmi })
    .onConflictDoUpdate({ target: appSettings.id, set: { lastBmi } });
}

export async function saveWaterSettings(bottleSizeMl: number, dailyWaterGoalMl: number) {
  await db
    .insert(appSettings)
    .values({ id: 1, bottleSizeMl, dailyWaterGoalMl })
    .onConflictDoUpdate({ target: appSettings.id, set: { bottleSizeMl, dailyWaterGoalMl } });
}

export async function saveWeightUnit(weightUnit: WeightUnit) {
  await db
    .insert(appSettings)
    .values({ id: 1, weightUnit })
    .onConflictDoUpdate({ target: appSettings.id, set: { weightUnit } });
}
