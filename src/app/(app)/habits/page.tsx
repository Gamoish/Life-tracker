import { Card, SectionHeader, PageHeader, StatTile } from "@/components/ui";
import Heatmap from "@/components/Heatmap";
import { formatShort, today } from "@/lib/date";
import { activityStreak, buildHeatmap } from "@/lib/heatmap";
import { isScheduledDay } from "@/lib/habit-streak";
import HabitCheckList, { type HabitNode } from "./HabitCheckList";
import HabitManager, { type ManagedHabit } from "./HabitManager";
import { listHabitsWithLogs } from "./queries";

export const dynamic = "force-dynamic";

/**
 * Weeks of history in the consistency grid. A full year is the familiar
 * framing, and at 12px cells it fills the desktop card without scrolling.
 */
const HEATMAP_WEEKS = 52;

export default async function HabitsPage() {
  const habitRows = await listHabitsWithLogs();
  const day = today();

  const activeHabits = habitRows.filter((h) => h.active);

  const checkList: HabitNode[] = activeHabits.map((h) => ({
    id: h.id,
    name: h.name,
    scheduledDays: h.scheduledDays,
    color: h.color,
    doneDates: h.doneDates,
  }));

  const managed: ManagedHabit[] = habitRows.map((h) => ({
    id: h.id,
    name: h.name,
    scheduledDays: h.scheduledDays,
    color: h.color,
    active: h.active,
  }));

  const activity = activeHabits.flatMap((h) => h.doneDates);

  const grid = buildHeatmap(activity, day, HEATMAP_WEEKS);
  const streak = activityStreak(activity, day);

  const dueToday = activeHabits.filter((h) => isScheduledDay(h.scheduledDays, day));
  const doneToday = dueToday.filter((h) => h.doneDates.includes(day)).length;

  return (
    <>
      <PageHeader title="Habits" subtitle={formatShort(day)} />

      <Card className="mb-8 p-4 sm:p-5">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-sm font-semibold tracking-tight">
              Consistency
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Habit check-offs, last {HEATMAP_WEEKS} weeks.
            </p>
          </div>
          <dl className="flex gap-2">
            <StatTile
              label="Streak"
              value={`${streak}d`}
              tone={streak > 0 ? "accent" : "neutral"}
              hint="Days in a row"
            />
            <StatTile
              label="Today"
              value={`${doneToday}/${dueToday.length}`}
              tone={
                dueToday.length > 0 && doneToday === dueToday.length
                  ? "done"
                  : "neutral"
              }
              hint="Habits checked"
            />
          </dl>
        </header>

        <Heatmap data={grid} label="Daily consistency" />
      </Card>

      <SectionHeader title="Today" right={`${doneToday} of ${dueToday.length}`} />
      <HabitCheckList habits={checkList} today={day} />

      <SectionHeader title="Manage" className="mt-8" />
      <HabitManager habits={managed} />
    </>
  );
}
