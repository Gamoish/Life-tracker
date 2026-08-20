import { Card, PageHeader, SectionHeader, StatTile } from "@/components/ui";
import Heatmap from "@/components/Heatmap";
import { formatShort, today, weekBounds } from "@/lib/date";
import { activityStreak, buildHeatmap } from "@/lib/heatmap";
import { summarizeDay } from "@/lib/health";
import {
  getHealthActivityDates,
  getHealthDay,
  getWorkoutDates,
  getWorkoutSummary,
  listRecentFoodDays,
  listRecentSleep,
  listRecentWaterDays,
  listRecentWeights,
  listRecentWorkouts,
} from "@/lib/health-queries";
import { getSettings } from "../settings/queries";
import HealthManager from "./HealthManager";
import HealthCalculators from "./HealthCalculators";
import HealthToday from "./HealthToday";

export const dynamic = "force-dynamic";

/** Same framing as the Habits consistency grid — a full year, 12px cells. */
const HEATMAP_WEEKS = 52;

export default async function HealthPage() {
  const day = today();
  const [weekStart, weekEnd] = weekBounds(day);

  const [
    data,
    activityDates,
    workoutDates,
    recentWorkouts,
    weekSummary,
    sleepHistory,
    foodHistory,
    settings,
    weightHistory,
    waterHistory,
  ] = await Promise.all([
    getHealthDay(day),
    getHealthActivityDates(),
    getWorkoutDates(),
    listRecentWorkouts(30),
    getWorkoutSummary(weekStart, weekEnd),
    listRecentSleep(30),
    listRecentFoodDays(14),
    getSettings(),
    listRecentWeights(90),
    listRecentWaterDays(14),
  ]);

  const summary = summarizeDay(data);

  const grid = buildHeatmap(activityDates, day, HEATMAP_WEEKS);
  const loggingStreak = activityStreak(activityDates, day);
  const workoutStreak = activityStreak(workoutDates, day);

  return (
    <>
      <PageHeader title="Health" subtitle={formatShort(day)} />

      <Card className="mb-8 p-4 sm:p-5">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-sm font-semibold tracking-tight">
              Consistency
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Anything logged — metrics, water, food, workouts — last {HEATMAP_WEEKS} weeks.
            </p>
          </div>
          <dl className="flex gap-2">
            <div data-testid="logging-streak-tile" data-value={loggingStreak}>
              <StatTile
                label="Streak"
                value={`${loggingStreak}d`}
                tone={loggingStreak > 0 ? "accent" : "neutral"}
                hint="Days in a row"
              />
            </div>
            <div data-testid="consistency-workout-streak-tile" data-value={workoutStreak}>
              <StatTile
                label="Workouts"
                value={`${workoutStreak}d`}
                tone={workoutStreak > 0 ? "done" : "neutral"}
                hint="Streak"
              />
            </div>
          </dl>
        </header>

        <Heatmap data={grid} label="Health consistency" />
      </Card>

      <HealthToday
        steps={summary.steps}
        weightKg={summary.weightKg}
        waterMl={summary.waterMl}
        calories={summary.calories}
        calorieGoal={settings.calorieGoal}
        food={data.food}
        sleep={data.sleep}
        bottleSizeMl={settings.bottleSizeMl}
        dailyWaterGoalMl={settings.dailyWaterGoalMl}
        weightUnit={settings.weightUnit}
      />

      <SectionHeader title="Calculators" className="mt-8" />
      <HealthCalculators weightKg={summary.weightKg} weightUnit={settings.weightUnit} />

      <SectionHeader title="Manage" className="mt-8" />
      <HealthManager
        metrics={{ steps: data.steps, weightKg: data.weightKg }}
        workouts={recentWorkouts}
        workoutStreak={workoutStreak}
        weekSummary={weekSummary}
        sleepHistory={sleepHistory}
        foodHistory={foodHistory}
        weightHistory={weightHistory}
        waterHistory={waterHistory}
        weightUnit={settings.weightUnit}
      />
    </>
  );
}
