import { Card, EmptyState, PageHeader, SectionHeader, StatTile } from "@/components/ui";
import Heatmap from "@/components/Heatmap";
import WeightChart from "@/components/WeightChart";
import SleepChart from "@/components/SleepChart";
import { IconDroplet, IconFlame, IconMoon, IconScale, IconSteps } from "@/components/icons";
import { formatShort, today, weekBounds } from "@/lib/date";
import { activityStreak, buildHeatmap } from "@/lib/heatmap";
import { summarizeDay } from "@/lib/health";
import { formatDuration } from "@/lib/sleep";
import { formatWeight } from "@/lib/weight-unit";
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
import HealthTargets from "./HealthTargets";
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

  // Charts read oldest-first (left-to-right); both histories arrive newest-first.
  const weightPoints = [...weightHistory].reverse();
  const sleepPoints = [...sleepHistory]
    .reverse()
    .map((s) => ({ date: s.date, durationMin: s.durationMin }));

  return (
    <>
      <PageHeader title="Health" subtitle={formatShort(day)} />

      {/* Today at a glance */}
      <dl className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Water"
          value={summary.waterMl}
          hint={`of ${settings.dailyWaterGoalMl} ml`}
          tone={summary.waterMl >= settings.dailyWaterGoalMl ? "done" : "accent"}
          progress={(summary.waterMl / settings.dailyWaterGoalMl) * 100}
          icon={<IconDroplet filled />}
        />
        <StatTile
          label="Calories"
          value={summary.calories}
          hint={settings.calorieGoal ? `of ${settings.calorieGoal} cal` : `${summary.foodCount} items`}
          tone={
            settings.calorieGoal
              ? summary.calories > settings.calorieGoal
                ? "warn"
                : "accent"
              : "neutral"
          }
          progress={settings.calorieGoal ? (summary.calories / settings.calorieGoal) * 100 : undefined}
          icon={<IconFlame />}
        />
        <StatTile
          label="Sleep"
          value={data.sleep ? formatDuration(data.sleep.durationMin) : "—"}
          hint={data.sleep ? "last night" : "not logged"}
          tone={data.sleep ? "wip" : "neutral"}
          icon={<IconMoon />}
        />
        <StatTile
          label="Weight"
          value={summary.weightKg !== null ? formatWeight(summary.weightKg, settings.weightUnit) : "—"}
          hint="latest"
          icon={<IconScale />}
        />
        <StatTile label="Steps" value={summary.steps ?? "—"} hint="today" icon={<IconSteps />} />
      </dl>

      {/* Trends */}
      <SectionHeader title="Trends" />
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">Weight</h3>
          {weightPoints.length < 2 ? (
            <EmptyState icon={<IconScale />} title="Not enough weight logs yet" hint="Log a couple of days to see a trend." />
          ) : (
            <WeightChart points={weightPoints} unit={settings.weightUnit} />
          )}
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-display text-sm font-semibold tracking-tight">Sleep</h3>
          {sleepPoints.length < 2 ? (
            <EmptyState icon={<IconMoon />} title="Not enough sleep logs yet" hint="Log a couple of nights to see a trend." />
          ) : (
            <SleepChart points={sleepPoints} />
          )}
        </Card>
      </div>

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

      <SectionHeader title="Log today" />
      <HealthToday
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

      <SectionHeader title="Targets" className="mt-8" />
      <HealthTargets
        bottleSizeMl={settings.bottleSizeMl}
        dailyWaterGoalMl={settings.dailyWaterGoalMl}
        weightUnit={settings.weightUnit}
        waterMl={summary.waterMl}
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
