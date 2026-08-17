"use server";

import { revalidatePath } from "next/cache";
import { saveCalorieGoal, saveWaterSettings, saveWeightUnit } from "./queries";

export type FormState = { error?: string; ok?: boolean };

function revalidateAll() {
  revalidatePath("/settings");
  revalidatePath("/health");
  revalidatePath("/"); // Today embeds the calorie-goal/water/weight widgets.
}

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = String(formData.get("calorieGoal") ?? "").trim();

  let calorieGoal: number | null = null;
  if (raw) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return { error: "Calorie goal must be a positive number" };
    calorieGoal = Math.round(n);
  }

  await saveCalorieGoal(calorieGoal);
  revalidateAll();
  return { ok: true };
}

export async function saveWater(_prev: FormState, formData: FormData): Promise<FormState> {
  const bottleSizeMl = Number(String(formData.get("bottleSizeMl") ?? "").trim());
  const dailyWaterGoalMl = Number(String(formData.get("dailyWaterGoalMl") ?? "").trim());

  if (!Number.isFinite(bottleSizeMl) || bottleSizeMl <= 0) {
    return { error: "Bottle size must be a positive number" };
  }
  if (!Number.isFinite(dailyWaterGoalMl) || dailyWaterGoalMl <= 0) {
    return { error: "Daily water goal must be a positive number" };
  }

  await saveWaterSettings(Math.round(bottleSizeMl), Math.round(dailyWaterGoalMl));
  revalidateAll();
  return { ok: true };
}

export async function saveWeight(_prev: FormState, formData: FormData): Promise<FormState> {
  const unit = String(formData.get("weightUnit") ?? "");
  if (unit !== "kg" && unit !== "lbs") return { error: "Pick kg or lbs" };

  await saveWeightUnit(unit);
  revalidateAll();
  return { ok: true };
}
