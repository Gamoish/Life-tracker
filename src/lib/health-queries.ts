import { and, asc, desc, eq, gte, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyHealth, foodLogs, sleepLogs, waterLogs, workouts } from "@/db/schema";

/**
 * The single DB path for Health, in the same spirit as `roadmap-queries.ts`:
 * server actions own validation and revalidation, this file owns the SQL.
 *
 * Keeping the statements here (rather than inline in `actions.ts`) means the
 * two that actually carry correctness risk — the COALESCE upsert and the water
 * increment — can be exercised straight against the database without a browser
 * or a Next request context, so their semantics are provable on their own.
 *
 * Every function takes `date` as a `YYYY-MM-DD` string. Callers resolve it with
 * `today()` from `./date` (APP_TIMEZONE = Asia/Kolkata) — never a browser clock.
 */

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type WorkoutRow = {
  id: number;
  type: string;
  durationMin: number;
  notes: string | null;
};

export type WorkoutHistoryRow = WorkoutRow & { date: string };

export type FoodRow = {
  id: number;
  item: string;
  calories: number | null;
  meal: MealType | null;
};

export type FoodHistoryRow = FoodRow & { date: string };

export type SleepEntry = {
  bedTime: string;
  wakeTime: string;
  durationMin: number;
};

export type SleepHistoryEntry = SleepEntry & { date: string };

export type WaterRow = { id: number; amountMl: number };

export type HealthDay = {
  date: string;
  steps: number | null;
  weightKg: number | null;
  waterMl: number;
  water: WaterRow[];
  sleep: SleepEntry | null;
  workouts: WorkoutRow[];
  food: FoodRow[];
};

/** A field left blank means "unchanged", so `null` here is never "erase". */
export type DailyMetrics = {
  steps: number | null;
  weightKg: number | null;
};

export type ClearableField = keyof DailyMetrics;

/* -------------------------------------------------------------------------
 * Reads
 * ---------------------------------------------------------------------- */

export async function getHealthDay(date: string): Promise<HealthDay> {
  const [dailyRows, waterRows, workoutRows, foodRows, sleepRows] = await Promise.all([
    db.select().from(dailyHealth).where(eq(dailyHealth.date, date)),
    db
      .select({ id: waterLogs.id, amountMl: waterLogs.amountMl })
      .from(waterLogs)
      .where(eq(waterLogs.date, date))
      .orderBy(asc(waterLogs.id)),
    db
      .select({
        id: workouts.id,
        type: workouts.type,
        durationMin: workouts.durationMin,
        notes: workouts.notes,
      })
      .from(workouts)
      .where(eq(workouts.date, date))
      .orderBy(asc(workouts.id)),
    db
      .select({
        id: foodLogs.id,
        item: foodLogs.item,
        calories: foodLogs.calories,
        meal: foodLogs.meal,
      })
      .from(foodLogs)
      .where(eq(foodLogs.date, date))
      .orderBy(asc(foodLogs.id)),
    db
      .select({ bedTime: sleepLogs.bedTime, wakeTime: sleepLogs.wakeTime, durationMin: sleepLogs.durationMin })
      .from(sleepLogs)
      .where(eq(sleepLogs.date, date)),
  ]);

  const daily = dailyRows[0];

  return {
    date,
    steps: daily?.steps ?? null,
    weightKg: daily?.weightKg ?? null,
    waterMl: waterRows.reduce((sum, r) => sum + r.amountMl, 0),
    water: waterRows,
    sleep: sleepRows[0] ?? null,
    workouts: workoutRows,
    food: foodRows,
  };
}

/**
 * One date string per health event, across every table — steps/weight
 * logged, a water log, a food item, a workout, a sleep log. Repeats stack,
 * same contract as the habit heatmap: this feeds `buildHeatmap`/
 * `activityStreak` from `./heatmap` directly.
 */
export async function getHealthActivityDates(): Promise<string[]> {
  const [dailyRows, waterRows, foodRows, workoutRows, sleepRows] = await Promise.all([
    db
      .select({ date: dailyHealth.date })
      .from(dailyHealth)
      .where(or(isNotNull(dailyHealth.steps), isNotNull(dailyHealth.weightKg))),
    db.selectDistinct({ date: waterLogs.date }).from(waterLogs),
    db.select({ date: foodLogs.date }).from(foodLogs),
    db.select({ date: workouts.date }).from(workouts),
    db.select({ date: sleepLogs.date }).from(sleepLogs),
  ]);

  return [
    ...dailyRows.map((r) => r.date),
    ...waterRows.map((r) => r.date),
    ...foodRows.map((r) => r.date),
    ...workoutRows.map((r) => r.date),
    ...sleepRows.map((r) => r.date),
  ];
}

/** Just the workout dates — for the workout-specific streak. */
export async function getWorkoutDates(): Promise<string[]> {
  const rows = await db.select({ date: workouts.date }).from(workouts);
  return rows.map((r) => r.date);
}

/** Most recent workouts across every day, newest first — not just today's. */
export async function listRecentWorkouts(limit = 30): Promise<WorkoutHistoryRow[]> {
  return db
    .select({
      id: workouts.id,
      date: workouts.date,
      type: workouts.type,
      durationMin: workouts.durationMin,
      notes: workouts.notes,
    })
    .from(workouts)
    .orderBy(desc(workouts.date), desc(workouts.id))
    .limit(limit);
}

/** Count + total minutes trained in an inclusive date range, e.g. this week. */
export async function getWorkoutSummary(
  start: string,
  end: string,
): Promise<{ count: number; totalMinutes: number }> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalMinutes: sql<number>`coalesce(sum(${workouts.durationMin}), 0)::int`,
    })
    .from(workouts)
    .where(and(gte(workouts.date, start), lte(workouts.date, end)));

  return row ?? { count: 0, totalMinutes: 0 };
}

/* -------------------------------------------------------------------------
 * sleep_logs — one row per night, bed/wake times with a derived duration
 * ---------------------------------------------------------------------- */

/** One night per date — logging again for the same night overwrites it. */
export async function upsertSleepLog(
  date: string,
  values: { bedTime: string; wakeTime: string; durationMin: number },
) {
  await db
    .insert(sleepLogs)
    .values({ date, ...values })
    .onConflictDoUpdate({ target: sleepLogs.date, set: values });
}

export async function deleteSleepLog(date: string) {
  await db.delete(sleepLogs).where(eq(sleepLogs.date, date));
}

/** Most recent nights, newest first — the sleep trend/history view. */
export async function listRecentSleep(limit = 30): Promise<SleepHistoryEntry[]> {
  return db
    .select({
      date: sleepLogs.date,
      bedTime: sleepLogs.bedTime,
      wakeTime: sleepLogs.wakeTime,
      durationMin: sleepLogs.durationMin,
    })
    .from(sleepLogs)
    .orderBy(desc(sleepLogs.date))
    .limit(limit);
}

/* -------------------------------------------------------------------------
 * daily_health — one row per day, partial saves must not clobber siblings
 * ---------------------------------------------------------------------- */

/**
 * Upsert today's metrics WITHOUT nulling the fields you didn't type.
 *
 *   INSERT INTO daily_health (date, steps, weight_kg)
 *   VALUES (...)
 *   ON CONFLICT (date) DO UPDATE SET
 *     steps       = COALESCE(EXCLUDED.steps,       daily_health.steps),
 *     ...
 *
 * `EXCLUDED.x` is the value this call proposed; `daily_health.x` is what's
 * already stored. COALESCE therefore reads as "the new value if one was given,
 * otherwise keep what's there" — so saving steps alone leaves an existing
 * weight untouched. A blank input arrives as null and means UNCHANGED;
 * erasing a value is a separate, explicit action (see below).
 *
 * Both columns are passed explicitly (null included) so that they appear in
 * the INSERT column list and `EXCLUDED` has something to refer to.
 */
export async function upsertDailyHealth(date: string, metrics: DailyMetrics) {
  await db
    .insert(dailyHealth)
    .values({
      date,
      steps: metrics.steps,
      weightKg: metrics.weightKg,
    })
    .onConflictDoUpdate({
      target: dailyHealth.date,
      set: {
        steps: sql`coalesce(excluded.steps, ${dailyHealth.steps})`,
        weightKg: sql`coalesce(excluded.weight_kg, ${dailyHealth.weightKg})`,
      },
    });
}

/**
 * Erase one metric on purpose.
 *
 * Deliberately its own action: if a blank input could clear a field, then
 * saving steps would wipe your weight, which is exactly what the COALESCE
 * above exists to prevent.
 */
export async function clearDailyHealthField(date: string, field: ClearableField) {
  const patch = field === "steps" ? { steps: null } : { weightKg: null };
  await db.update(dailyHealth).set(patch).where(eq(dailyHealth.date, date));
}

export type WeightHistoryEntry = { date: string; weightKg: number };

/** Recent days with a weight logged, newest first — the weight trend view. */
export async function listRecentWeights(limit = 90): Promise<WeightHistoryEntry[]> {
  const rows = await db
    .select({ date: dailyHealth.date, weightKg: dailyHealth.weightKg })
    .from(dailyHealth)
    .where(isNotNull(dailyHealth.weightKg))
    .orderBy(desc(dailyHealth.date))
    .limit(limit);
  return rows.map((r) => ({ date: r.date, weightKg: r.weightKg as number }));
}

/* -------------------------------------------------------------------------
 * water_logs — one row per log event (a bottle tap or a custom amount)
 * ---------------------------------------------------------------------- */

/** A bottle tap or a custom amount — either way, one new row. */
export async function logWater(date: string, amountMl: number) {
  await db.insert(waterLogs).values({ date, amountMl });
}

/** Undo a mis-tap or a wrong custom amount. */
export async function deleteWaterLog(id: number) {
  await db.delete(waterLogs).where(eq(waterLogs.id, id));
}

export type WaterDayHistory = { date: string; totalMl: number; entries: WaterRow[] };

/**
 * Recent days with any water logged, newest first, each with its own entries
 * and ml total — same two-query shape as `listRecentFoodDays` (distinct
 * recent dates, then every row on those dates, grouped in JS).
 */
export async function listRecentWaterDays(limit = 14): Promise<WaterDayHistory[]> {
  const dateRows = await db
    .selectDistinct({ date: waterLogs.date })
    .from(waterLogs)
    .orderBy(desc(waterLogs.date))
    .limit(limit);
  const dates = dateRows.map((r) => r.date);
  if (dates.length === 0) return [];

  const rows = await db
    .select({ id: waterLogs.id, date: waterLogs.date, amountMl: waterLogs.amountMl })
    .from(waterLogs)
    .where(inArray(waterLogs.date, dates))
    .orderBy(asc(waterLogs.id));

  const byDate = new Map<string, WaterRow[]>();
  for (const r of rows) {
    const bucket = byDate.get(r.date);
    const entry = { id: r.id, amountMl: r.amountMl };
    if (bucket) bucket.push(entry);
    else byDate.set(r.date, [entry]);
  }

  return dates.map((date) => {
    const entries = byDate.get(date) ?? [];
    return { date, entries, totalMl: entries.reduce((sum, e) => sum + e.amountMl, 0) };
  });
}

/* -------------------------------------------------------------------------
 * workouts
 * ---------------------------------------------------------------------- */

export async function insertWorkout(
  date: string,
  values: { type: string; durationMin: number; notes: string | null },
) {
  await db.insert(workouts).values({ date, ...values });
}

/** Scoped to `date` as well as id, so a stale form can't edit another day. */
export async function updateWorkoutRow(
  id: number,
  date: string,
  values: { type: string; durationMin: number; notes: string | null },
) {
  await db
    .update(workouts)
    .set(values)
    .where(and(eq(workouts.id, id), eq(workouts.date, date)));
}

export async function deleteWorkoutRow(id: number) {
  await db.delete(workouts).where(eq(workouts.id, id));
}

/* -------------------------------------------------------------------------
 * food_logs
 * ---------------------------------------------------------------------- */

export async function insertFood(
  date: string,
  values: { item: string; calories: number | null; meal: MealType | null },
) {
  await db.insert(foodLogs).values({ date, ...values });
}

export async function updateFoodRow(
  id: number,
  date: string,
  values: { item: string; calories: number | null; meal: MealType | null },
) {
  await db
    .update(foodLogs)
    .set(values)
    .where(and(eq(foodLogs.id, id), eq(foodLogs.date, date)));
}

export async function deleteFoodRow(id: number) {
  await db.delete(foodLogs).where(eq(foodLogs.id, id));
}

/**
 * Recent days that have food logged, newest first, each with its own rows
 * and calorie total — the food history view. Two queries (distinct recent
 * dates, then every row on those dates) rather than one, so grouping happens
 * in JS the same way `listActiveTasks` groups completions by task.
 */
export type FoodDayHistory = { date: string; items: FoodRow[]; totalCalories: number };

export async function listRecentFoodDays(limit = 14): Promise<FoodDayHistory[]> {
  const dateRows = await db
    .selectDistinct({ date: foodLogs.date })
    .from(foodLogs)
    .orderBy(desc(foodLogs.date))
    .limit(limit);
  const dates = dateRows.map((r) => r.date);
  if (dates.length === 0) return [];

  const rows = await db
    .select({
      id: foodLogs.id,
      date: foodLogs.date,
      item: foodLogs.item,
      calories: foodLogs.calories,
      meal: foodLogs.meal,
    })
    .from(foodLogs)
    .where(inArray(foodLogs.date, dates))
    .orderBy(asc(foodLogs.id));

  const byDate = new Map<string, FoodRow[]>();
  for (const r of rows) {
    const bucket = byDate.get(r.date);
    const item = { id: r.id, item: r.item, calories: r.calories, meal: r.meal };
    if (bucket) bucket.push(item);
    else byDate.set(r.date, [item]);
  }

  return dates.map((date) => {
    const items = byDate.get(date) ?? [];
    return {
      date,
      items,
      totalCalories: items.reduce((sum, i) => sum + (i.calories ?? 0), 0),
    };
  });
}
