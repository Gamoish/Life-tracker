import { db } from "@/db";
import {
  accounts,
  categoryBudgets,
  dailyHealth,
  expenseCategories,
  foodLogs,
  goalMilestones,
  goals,
  habitLogs,
  habits,
  journalEntries,
  recurringBills,
  roadmapTopics,
  roadmaps,
  sleepLogs,
  taskCompletions,
  tasks,
  transactions,
  waterLogs,
  workouts,
} from "@/db/schema";

/**
 * Everything, as one JSON file — a personal backup, not a report. Protected
 * automatically: `/api/*` isn't in `middleware.ts`'s exclusion list (only
 * static/PWA assets are), so the same session-redirect gate that covers
 * every page covers this route too.
 */
export async function GET() {
  const [
    tasksRows,
    taskCompletionsRows,
    habitsRows,
    habitLogsRows,
    goalsRows,
    goalMilestonesRows,
    roadmapsRows,
    roadmapTopicsRows,
    accountsRows,
    expenseCategoriesRows,
    transactionsRows,
    recurringBillsRows,
    categoryBudgetsRows,
    dailyHealthRows,
    sleepLogsRows,
    workoutsRows,
    foodLogsRows,
    waterLogsRows,
    journalEntriesRows,
  ] = await Promise.all([
    db.select().from(tasks),
    db.select().from(taskCompletions),
    db.select().from(habits),
    db.select().from(habitLogs),
    db.select().from(goals),
    db.select().from(goalMilestones),
    db.select().from(roadmaps),
    db.select().from(roadmapTopics),
    db.select().from(accounts),
    db.select().from(expenseCategories),
    db.select().from(transactions),
    db.select().from(recurringBills),
    db.select().from(categoryBudgets),
    db.select().from(dailyHealth),
    db.select().from(sleepLogs),
    db.select().from(workouts),
    db.select().from(foodLogs),
    db.select().from(waterLogs),
    db.select().from(journalEntries),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    tasks: tasksRows,
    taskCompletions: taskCompletionsRows,
    habits: habitsRows,
    habitLogs: habitLogsRows,
    goals: goalsRows,
    goalMilestones: goalMilestonesRows,
    roadmaps: roadmapsRows,
    roadmapTopics: roadmapTopicsRows,
    accounts: accountsRows,
    expenseCategories: expenseCategoriesRows,
    transactions: transactionsRows,
    recurringBills: recurringBillsRows,
    categoryBudgets: categoryBudgetsRows,
    dailyHealth: dailyHealthRows,
    sleepLogs: sleepLogsRows,
    workouts: workoutsRows,
    foodLogs: foodLogsRows,
    waterLogs: waterLogsRows,
    journalEntries: journalEntriesRows,
  };

  const filename = `tracker-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
