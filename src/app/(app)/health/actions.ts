"use server";

import { revalidatePath } from "next/cache";
import {
  clearDailyHealthField,
  deleteFoodRow,
  deleteWaterLog,
  deleteWorkoutRow,
  insertFood,
  insertWorkout,
  logWater,
  updateFoodRow,
  updateWorkoutRow,
  upsertDailyHealth,
  upsertSleepLog,
  type ClearableField,
  type MealType,
} from "@/lib/health-queries";
import { computeSleepDuration } from "@/lib/sleep";
import { fromDisplay, type WeightUnit } from "@/lib/weight-unit";
import { today } from "@/lib/date";
import { saveCalorieGoal, saveLastBmi } from "../settings/queries";

const MEAL_TYPES: readonly MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function parseMeal(raw: FormDataEntryValue | null): MealType | null {
  const trimmed = String(raw ?? "").trim();
  return (MEAL_TYPES as readonly string[]).includes(trimmed) ? (trimmed as MealType) : null;
}

export type FormState = { error?: string; ok?: boolean };

function revalidateAll() {
  revalidatePath("/health");
  revalidatePath("/"); // Today embeds the quick-log widget.
}

/** Parses a form's numeric field: blank -> unchanged (null), garbage -> error. */
function parseOptionalNumber(
  raw: FormDataEntryValue | null,
  label: string,
): { value?: number | null; error?: string } {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { value: null };
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return { error: `${label} must be a number` };
  return { value: n };
}

/* -------------------------------------------------------------------------
 * Daily metrics — steps / weight
 * ---------------------------------------------------------------------- */

export async function saveMetrics(_prev: FormState, formData: FormData): Promise<FormState> {
  const steps = parseOptionalNumber(formData.get("steps"), "Steps");
  if (steps.error) return { error: steps.error };

  const weightKg = parseOptionalNumber(formData.get("weightKg"), "Weight");
  if (weightKg.error) return { error: weightKg.error };

  await upsertDailyHealth(today(), {
    steps: steps.value ?? null,
    weightKg: weightKg.value ?? null,
  });

  revalidateAll();
  return { ok: true };
}

export async function clearMetric(field: ClearableField) {
  await clearDailyHealthField(today(), field);
  revalidateAll();
}

/**
 * The Today-dashboard quick-tap: one field, converted from the user's
 * configured unit into kg, and passed through `upsertDailyHealth`'s COALESCE
 * upsert (`steps: null`) so it never clobbers steps already logged today —
 * same "light tap vs. heavy Manager form" split as sleep.
 */
export async function logWeight(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = String(formData.get("weight") ?? "").trim();
  const unit = String(formData.get("unit") ?? "kg") as WeightUnit;
  if (!raw) return { error: "Weight is required" };

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return { error: "Weight must be a positive number" };

  await upsertDailyHealth(today(), { steps: null, weightKg: fromDisplay(n, unit) });
  revalidateAll();
  return { ok: true };
}

export async function saveBmi(_prev: FormState, formData: FormData): Promise<FormState> {
  const bmi = Number(String(formData.get("bmi") ?? ""));
  if (!Number.isFinite(bmi) || bmi <= 0 || bmi > 100) return { error: "Calculate a valid BMI first" };
  await saveLastBmi(Math.round(bmi * 10) / 10);
  revalidateAll();
  return { ok: true };
}

export async function saveCalorieRequirement(_prev: FormState, formData: FormData): Promise<FormState> {
  const calories = Number(String(formData.get("calories") ?? ""));
  if (!Number.isFinite(calories) || calories <= 0 || calories > 10000) {
    return { error: "Calculate a valid calorie requirement first" };
  }
  await saveCalorieGoal(Math.round(calories));
  revalidateAll();
  return { ok: true };
}

/* -------------------------------------------------------------------------
 * Sleep — bed/wake time, duration always derived from the two
 * ---------------------------------------------------------------------- */

/**
 * Defaults to last night: bedTime/wakeTime arrive as "HH:MM" from the quick-log
 * form (pre-filled by the client to yesterday-evening/this-morning), logged
 * against TODAY's date since that's the morning the sleep is reported on.
 */
export async function saveSleep(_prev: FormState, formData: FormData): Promise<FormState> {
  const bedTime = String(formData.get("bedTime") ?? "").trim();
  const wakeTime = String(formData.get("wakeTime") ?? "").trim();
  if (!bedTime || !wakeTime) return { error: "Bed time and wake time are required" };

  const durationMin = computeSleepDuration(bedTime, wakeTime);
  await upsertSleepLog(today(), { bedTime, wakeTime, durationMin });

  revalidateAll();
  return { ok: true };
}

/* -------------------------------------------------------------------------
 * Water — a bottle tap or a custom ml amount, each its own log row
 * ---------------------------------------------------------------------- */

/** The bottle-tap button — `amountMl` is the configured bottle size. */
export async function logWaterBottle(amountMl: number) {
  await logWater(today(), amountMl);
  revalidateAll();
}

export async function logWaterCustom(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = String(formData.get("amountMl") ?? "").trim();
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return { error: "Amount must be a positive number" };

  await logWater(today(), Math.round(n));
  revalidateAll();
  return { ok: true };
}

export async function deleteWater(id: number) {
  await deleteWaterLog(id);
  revalidateAll();
}

/* -------------------------------------------------------------------------
 * Food log
 * ---------------------------------------------------------------------- */

export async function addFood(_prev: FormState, formData: FormData): Promise<FormState> {
  const item = String(formData.get("item") ?? "").trim();
  if (!item) return { error: "Item is required" };

  const calories = parseOptionalNumber(formData.get("calories"), "Calories");
  if (calories.error) return { error: calories.error };

  const meal = parseMeal(formData.get("meal"));

  await insertFood(today(), { item, calories: calories.value ?? null, meal });
  revalidateAll();
  return { ok: true };
}

export async function editFood(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get("id"));
  const item = String(formData.get("item") ?? "").trim();
  if (!Number.isFinite(id)) return { error: "Missing entry" };
  if (!item) return { error: "Item is required" };

  const calories = parseOptionalNumber(formData.get("calories"), "Calories");
  if (calories.error) return { error: calories.error };

  const meal = parseMeal(formData.get("meal"));

  await updateFoodRow(id, today(), { item, calories: calories.value ?? null, meal });
  revalidateAll();
  return { ok: true };
}

export async function deleteFood(id: number) {
  await deleteFoodRow(id);
  revalidateAll();
}

/* -------------------------------------------------------------------------
 * Workouts
 * ---------------------------------------------------------------------- */

export async function addWorkout(_prev: FormState, formData: FormData): Promise<FormState> {
  const type = String(formData.get("type") ?? "").trim();
  if (!type) return { error: "Type is required" };

  const duration = Number(String(formData.get("durationMin") ?? "").trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    return { error: "Duration must be a positive number" };
  }

  const notes = String(formData.get("notes") ?? "").trim();

  await insertWorkout(today(), { type, durationMin: Math.round(duration), notes: notes || null });
  revalidateAll();
  return { ok: true };
}

export async function editWorkout(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get("id"));
  // The workout's OWN date, not today() — the history list edits entries from
  // any day, and `updateWorkoutRow` scopes its WHERE to (id, date), so forcing
  // today() here would silently match zero rows for anything logged earlier.
  const date = String(formData.get("date") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  if (!Number.isFinite(id)) return { error: "Missing workout" };
  if (!date) return { error: "Missing date" };
  if (!type) return { error: "Type is required" };

  const duration = Number(String(formData.get("durationMin") ?? "").trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    return { error: "Duration must be a positive number" };
  }

  const notes = String(formData.get("notes") ?? "").trim();

  await updateWorkoutRow(id, date, {
    type,
    durationMin: Math.round(duration),
    notes: notes || null,
  });
  revalidateAll();
  return { ok: true };
}

export async function deleteWorkout(id: number) {
  await deleteWorkoutRow(id);
  revalidateAll();
}
