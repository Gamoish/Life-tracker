import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { goalMilestones, goals } from "@/db/schema";
import { Card, EmptyState, PageHeader, Pill, ProgressBar, StatTile, type Tone } from "@/components/ui";
import { IconDroplet, IconFlame, IconRepeat, IconSteps, IconTarget } from "@/components/icons";
import { addDays, currentHour, formatShort, today } from "@/lib/date";
import { computeGoalProgress } from "@/lib/goal-progress";
import { currentStreak, isScheduledDay } from "@/lib/habit-streak";
import { buildHeatmap } from "@/lib/heatmap";
import { summarizeDay } from "@/lib/health";
import { getHealthDay } from "@/lib/health-queries";
import { getRoadmapProgressMap } from "@/lib/roadmap-queries";
import { mergeUpcoming, type UpcomingItem } from "@/lib/upcoming";
import { getUpcomingBills, getUpcomingEmis } from "./expenses/queries";
import HabitCheckList, { type HabitNode } from "./habits/HabitCheckList";
import { listHabitsWithLogs } from "./habits/queries";
import { getSettings } from "./settings/queries";
import { listActiveTasks, summarizeDueTasks } from "./tasks/queries";
import TodayQuickAdd from "./TodayQuickAdd";

export const dynamic = "force-dynamic";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const HEAT_CLASS = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"] as const;

/** A little warmth on the one screen you open every day. */
function greeting(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Winding down";
}

export default async function TodayPage() {
  const day = today();

  const [
    habitRows,
    goalRows,
    healthDay,
    settings,
    tasks,
    upcomingBills,
    upcomingEmis,
  ] = await Promise.all([
    listHabitsWithLogs(),
    db.select().from(goals).where(eq(goals.status, "active")).orderBy(asc(goals.id)),
    getHealthDay(day),
    getSettings(),
    listActiveTasks(),
    getUpcomingBills(day, 7),
    getUpcomingEmis(day, 7),
  ]);

  const activeHabits = habitRows.filter((h) => h.active);
  const dueHabits = activeHabits.filter((h) => isScheduledDay(h.scheduledDays, day));
  const doneHabits = dueHabits.filter((h) => h.doneDates.includes(day)).length;

  const checkList: HabitNode[] = activeHabits.map((h) => ({
    id: h.id,
    name: h.name,
    scheduledDays: h.scheduledDays,
    color: h.color,
    doneDates: h.doneDates,
  }));

  const bestStreak = Math.max(
    0,
    ...activeHabits.map((h) => currentStreak(h.scheduledDays, h.doneDates, day)),
  );

  const weekHeat = buildHeatmap(
    activeHabits.flatMap((h) => h.doneDates),
    day,
    1,
  ).weeks[0];

  const goalIds = goalRows.map((g) => g.id);
  const [milestoneRows, roadmapProgress] = await Promise.all([
    goalIds.length > 0
      ? db.select().from(goalMilestones).where(inArray(goalMilestones.goalId, goalIds))
      : Promise.resolve([]),
    getRoadmapProgressMap(
      goalRows.map((g) => g.roadmapId).filter((id): id is number => id !== null),
    ),
  ]);

  const milestonesByGoal = new Map<number, { done: boolean }[]>();
  for (const m of milestoneRows) {
    const bucket = milestonesByGoal.get(m.goalId);
    if (bucket) bucket.push({ done: m.done });
    else milestonesByGoal.set(m.goalId, [{ done: m.done }]);
  }

  const goalSummaries = goalRows.map((g) => {
    const progress = computeGoalProgress(
      { progressSource: g.progressSource, roadmapId: g.roadmapId, manualProgress: g.manualProgress },
      {
        roadmapProgress: g.roadmapId === null ? null : roadmapProgress.get(g.roadmapId),
        milestones: milestonesByGoal.get(g.id) ?? [],
      },
    );
    return { id: g.id, title: g.title, percent: progress.percent };
  });

  const healthSummary = summarizeDay(healthDay);

  const upNext = buildUpNext(summarizeDueTasks(tasks, day), mergeUpcoming(upcomingBills, upcomingEmis), day);

  return (
    <>
      <PageHeader
        title={greeting(currentHour())}
        subtitle={formatShort(day)}
        action={
          bestStreak > 0 ? (
            <div className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft px-3.5 py-2">
              <IconFlame className="h-3.5 w-3.5 text-accent" />
              <span className="font-mono text-sm font-semibold text-accent">
                {bestStreak}-day best streak
              </span>
            </div>
          ) : undefined
        }
      />

      {/* Week strip — this week's habit activity, Monday first. */}
      <div className="mb-5 grid grid-cols-7 gap-2">
        {WEEKDAY_LETTERS.map((letter, i) => {
          const date = addDays(weekHeat.start, i);
          const cell = weekHeat.days[i];
          const level = cell?.level ?? 0;
          const isToday = date === day;
          return (
            <div
              key={date}
              className={`flex flex-col items-center gap-1.5 rounded-card border px-1.5 py-2.5 ${
                isToday ? "border-accent bg-accent-soft" : "border-line bg-surface"
              }`}
            >
              <span className={`font-mono text-2xs ${isToday ? "text-accent" : "text-faint"}`}>
                {letter}
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {Number(date.slice(-2))}
              </span>
              <span className="h-1 w-full overflow-hidden rounded-full bg-raised">
                {level > 0 && <span className={`block h-full rounded-full ${HEAT_CLASS[level]}`} />}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary tiles */}
      <dl className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="Habits"
          value={`${doneHabits}/${dueHabits.length}`}
          hint="done"
          tone={dueHabits.length > 0 && doneHabits === dueHabits.length ? "done" : "accent"}
          progress={dueHabits.length > 0 ? (doneHabits / dueHabits.length) * 100 : 0}
          icon={<IconRepeat />}
        />
        <StatTile
          label="Water"
          value={healthSummary.waterMl}
          hint={`of ${settings.dailyWaterGoalMl} ml`}
          tone={healthSummary.waterMl >= settings.dailyWaterGoalMl ? "done" : "accent"}
          progress={(healthSummary.waterMl / settings.dailyWaterGoalMl) * 100}
          icon={<IconDroplet filled />}
        />
        <StatTile label="Steps" value={healthSummary.steps ?? "—"} icon={<IconSteps />} />
        <StatTile
          label="Calories"
          value={healthSummary.calories}
          hint={settings.calorieGoal ? `of ${settings.calorieGoal} cal` : `${healthDay.food.length} items`}
          tone={
            settings.calorieGoal
              ? healthSummary.calories > settings.calorieGoal
                ? "warn"
                : "accent"
              : "neutral"
          }
          progress={settings.calorieGoal ? (healthSummary.calories / settings.calorieGoal) * 100 : undefined}
          icon={<IconFlame />}
        />
      </dl>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold tracking-tight">Habits due today</h3>
            <Link href="/habits" className="font-mono text-xs text-muted hover:text-accent">
              view all →
            </Link>
          </div>
          <HabitCheckList habits={checkList} today={day} emptyMessage="No habits due today" />
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2.5 text-2xs font-semibold uppercase tracking-[0.14em] text-faint">
              Quick add
            </p>
            <TodayQuickAdd bottleSizeMl={settings.bottleSizeMl} />
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-semibold tracking-tight">Active goals</h3>
              <Link href="/goals" className="font-mono text-xs text-muted hover:text-accent">
                view all →
              </Link>
            </div>
            {goalSummaries.length === 0 ? (
              <EmptyState icon={<IconTarget />} title="No active goals" hint="Start one on the Goals page." />
            ) : (
              <ul className="space-y-4">
                {goalSummaries.slice(0, 4).map((g) => (
                  <li key={g.id}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">{g.title}</span>
                      <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-accent">
                        {g.percent === null ? "—" : `${g.percent}%`}
                      </span>
                    </div>
                    <ProgressBar value={g.percent ?? 0} tone={g.percent === 100 ? "done" : "accent"} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-display text-lg font-semibold tracking-tight">Up next</h3>
            {upNext.length === 0 ? (
              <p className="text-sm text-faint">Nothing due soon.</p>
            ) : (
              <ul className="space-y-3">
                {upNext.map((row) => (
                  <li key={row.key} className="flex items-center gap-2.5">
                    <span aria-hidden className={`h-2 w-2 shrink-0 rounded-[2px] ${DOT_CLASS[row.tone]}`} />
                    <span className="min-w-0 flex-1 truncate text-sm">{row.label}</span>
                    <Pill tone={row.tone}>{row.sublabel}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

const DOT_CLASS: Record<Tone, string> = {
  neutral: "bg-muted",
  idle: "bg-idle",
  wip: "bg-wip",
  done: "bg-done",
  warn: "bg-warn",
  accent: "bg-accent",
};

type UpNextRow = { key: string; label: string; sublabel: string; tone: Tone; rank: string };

/** Merges the nearest due tasks (bell rules — overdue or due today) and the
    nearest upcoming bills/EMIs into one date-sorted top-3 "what's next". */
function buildUpNext(
  dueTasks: { id: number; title: string; overdue: boolean }[],
  upcoming: UpcomingItem[],
  today: string,
): UpNextRow[] {
  const taskRows: UpNextRow[] = dueTasks.map((t) => ({
    key: `task-${t.id}`,
    label: t.title,
    sublabel: t.overdue ? "Overdue" : "Today",
    tone: t.overdue ? "warn" : "accent",
    rank: t.overdue ? "" : today,
  }));

  const upcomingRows: UpNextRow[] = upcoming.map((item) => ({
    key: `${item.kind}-${item.id}`,
    label: item.name,
    sublabel: formatShort(item.dueDate),
    tone: item.dueDate < today ? "warn" : item.dueDate === today ? "accent" : "wip",
    rank: item.dueDate,
  }));

  return [...taskRows, ...upcomingRows].sort((a, b) => a.rank.localeCompare(b.rank)).slice(0, 3);
}
