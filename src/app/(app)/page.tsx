import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { goalMilestones, goals } from "@/db/schema";
import { EmptyState, PageHeader, Pill, ProgressBar, SectionHeader, StatTile, TextButton } from "@/components/ui";
import { IconAdd, IconDroplet, IconFlame, IconRepeat, IconSteps, IconTarget } from "@/components/icons";
import { currentHour, formatShort, monthBounds, today } from "@/lib/date";
import { computeGoalProgress } from "@/lib/goal-progress";
import { isScheduledDay } from "@/lib/habit-streak";
import { summarizeDay } from "@/lib/health";
import { getHealthDay } from "@/lib/health-queries";
import { getRoadmapProgressMap } from "@/lib/roadmap-queries";
import { mergeUpcoming } from "@/lib/upcoming";
import ExpenseSnapshot from "./expenses/ExpenseSnapshot";
import {
  getMonthSummary,
  getTotalBalance,
  getUpcomingBills,
  getUpcomingEmis,
  listCategoryBudgetStatus,
  listTransactions,
} from "./expenses/queries";
import HabitCheckList, { type HabitNode } from "./habits/HabitCheckList";
import { listHabitsWithLogs } from "./habits/queries";
import HealthToday from "./health/HealthToday";
import JournalToday from "./journal/JournalToday";
import { getJournalEntry } from "./journal/queries";
import { getSettings } from "./settings/queries";
import { logout } from "../login/actions";

export const dynamic = "force-dynamic";

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
  const [monthStart, monthEnd] = monthBounds(day);

  const [
    habitRows,
    goalRows,
    healthDay,
    totalBalance,
    monthSummary,
    recentTransactions,
    upcomingBills,
    upcomingEmis,
    budgetStatus,
    settings,
    journalText,
  ] = await Promise.all([
    listHabitsWithLogs(),
    db.select().from(goals).where(eq(goals.status, "active")).orderBy(asc(goals.id)),
    getHealthDay(day),
    getTotalBalance(),
    getMonthSummary(monthStart, monthEnd),
    listTransactions({}, 5),
    getUpcomingBills(day, 7),
    getUpcomingEmis(day, 7),
    listCategoryBudgetStatus(monthStart, monthEnd),
    getSettings(),
    getJournalEntry(day),
  ]);
  const upcoming = mergeUpcoming(upcomingBills, upcomingEmis);

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
    return { id: g.id, title: g.title, category: g.category, percent: progress.percent };
  });

  const scored = goalSummaries.filter((g) => g.percent !== null);
  const avgPercent =
    scored.length > 0
      ? Math.round(scored.reduce((sum, g) => sum + (g.percent ?? 0), 0) / scored.length)
      : null;

  const healthSummary = summarizeDay(healthDay);

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={`${greeting(currentHour())} · ${formatShort(day)}`}
        action={
          <form action={logout}>
            <TextButton type="submit">Lock</TextButton>
          </form>
        }
      />

      <dl className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Habits"
          value={`${doneHabits}/${dueHabits.length}`}
          tone={dueHabits.length > 0 && doneHabits === dueHabits.length ? "done" : "accent"}
          hint="Due today"
          icon={<IconRepeat />}
        />
        <StatTile
          label="Goals"
          value={goalRows.length}
          tone="accent"
          hint={avgPercent === null ? "active" : `avg ${avgPercent}%`}
          icon={<IconTarget />}
        />
        <StatTile label="Steps" value={healthSummary.steps ?? "—"} icon={<IconSteps />} />
        <StatTile
          label="Water"
          value={`${healthSummary.waterMl}`}
          hint={`of ${settings.dailyWaterGoalMl} ml goal`}
          icon={<IconDroplet />}
        />
        <StatTile label="Calories" value={healthSummary.calories} icon={<IconFlame />} />
      </dl>

      <SectionHeader title="Habits" right={<Link href="/habits">All habits →</Link>} />
      <HabitCheckList habits={checkList} today={day} emptyMessage="No habits due today" />

      <SectionHeader title="Health" className="mt-8" right={<Link href="/health">Log more →</Link>} />
      <HealthToday
        steps={healthSummary.steps}
        weightKg={healthSummary.weightKg}
        waterMl={healthSummary.waterMl}
        calories={healthSummary.calories}
        calorieGoal={settings.calorieGoal}
        food={healthDay.food}
        sleep={healthDay.sleep}
        bottleSizeMl={settings.bottleSizeMl}
        dailyWaterGoalMl={settings.dailyWaterGoalMl}
        weightUnit={settings.weightUnit}
      />

      <SectionHeader title="Goals" className="mt-8" right={<Link href="/goals">All goals →</Link>} />
      {goalSummaries.length === 0 ? (
        <EmptyState
          icon={<IconAdd />}
          title="No active goals right now"
          hint="Start one on the Goals page."
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {goalSummaries.slice(0, 6).map((g) => (
            <li key={g.id}>
              <Link
                href="/goals"
                className="block rounded-card border border-line bg-gradient-to-b from-raised/60 to-surface p-3.5 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_14px_32px_-16px_rgba(247,138,4,0.4)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">{g.title}</p>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-faint">
                    {g.percent === null ? "—" : `${g.percent}%`}
                  </span>
                </div>
                <div className="mt-1.5 mb-2">
                  <Pill tone="neutral">{g.category}</Pill>
                </div>
                <ProgressBar value={g.percent ?? 0} tone={g.percent === 100 ? "done" : "accent"} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {goalSummaries.length > 6 && (
        <p className="mt-2 text-xs text-faint">
          +{goalSummaries.length - 6} more —{" "}
          <Link href="/goals" className="text-accent underline underline-offset-4">
            see all goals
          </Link>
        </p>
      )}

      <SectionHeader title="Expenses" className="mt-8" right={<Link href="/expenses">Open Expenses →</Link>} />
      <ExpenseSnapshot
        totalBalance={totalBalance}
        monthSummary={monthSummary}
        recent={recentTransactions}
        upcoming={upcoming}
        budgetStatus={budgetStatus}
      />

      <SectionHeader title="Journal" className="mt-8" />
      <JournalToday text={journalText} />
    </>
  );
}
