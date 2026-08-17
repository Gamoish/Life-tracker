import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { taskCompletions, tasks } from "@/db/schema";
import { isDueOn, isOverdue, type TaskRecurrence } from "@/lib/task-schedule";

/**
 * The single DB path for Tasks, shared by the Tasks page and the nav bell
 * (via `AppLayout`) so "what's due" can never drift between the two — both
 * derive it from the same rows through the same pure `task-schedule.ts`
 * rules.
 */

export type TaskWithCompletions = {
  id: number;
  title: string;
  notes: string | null;
  category: string | null;
  recurrence: TaskRecurrence;
  dueDate: string;
  scheduledDays: number[] | null;
  /** One-off completion only. */
  completedAt: string | null;
  /** Recurring completion log — dates (YYYY-MM-DD) this task was checked off. */
  completedDates: string[];
};

export async function listActiveTasks(): Promise<TaskWithCompletions[]> {
  const [taskRows, completionRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.active, true)).orderBy(asc(tasks.dueDate), asc(tasks.id)),
    // Only `done` rows matter — an un-done row is the same as no row, same
    // rule `listHabitsWithLogs` applies to `habit_logs`.
    db
      .select({ taskId: taskCompletions.taskId, date: taskCompletions.date })
      .from(taskCompletions)
      .where(eq(taskCompletions.done, true)),
  ]);

  const byTask = new Map<number, string[]>();
  for (const c of completionRows) {
    const bucket = byTask.get(c.taskId);
    if (bucket) bucket.push(c.date);
    else byTask.set(c.taskId, [c.date]);
  }

  return taskRows.map((t) => ({
    id: t.id,
    title: t.title,
    notes: t.notes,
    category: t.category,
    recurrence: t.recurrence,
    dueDate: t.dueDate,
    scheduledDays: t.scheduledDays,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    completedDates: byTask.get(t.id) ?? [],
  }));
}

export type DueTaskSummary = {
  id: number;
  title: string;
  overdue: boolean;
};

/**
 * Tasks that belong in the bell: due today and not yet done, or overdue.
 * Pure — takes the rows `listActiveTasks` already fetched, so the Tasks page
 * and the nav bell can share one query per request instead of each running
 * their own, and can never disagree about which tasks qualify.
 */
export function summarizeDueTasks(allTasks: TaskWithCompletions[], today: string): DueTaskSummary[] {
  const out: DueTaskSummary[] = [];

  for (const t of allTasks) {
    if (t.recurrence === "one_off") {
      if (t.completedAt || t.dueDate > today) continue;
      out.push({ id: t.id, title: t.title, overdue: t.dueDate < today });
      continue;
    }

    const overdue = isOverdue(t, t.completedDates, today);
    const dueTodayNotDone = isDueOn(t, today) && !t.completedDates.includes(today);
    if (overdue || dueTodayNotDone) {
      out.push({ id: t.id, title: t.title, overdue });
    }
  }

  // Overdue first — the more urgent half of the badge deserves top billing.
  return out.sort((a, b) => Number(b.overdue) - Number(a.overdue));
}
