import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  time,
  timestamp,
  unique,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------
 * Enums
 * ---------------------------------------------------------------------- */

export const topicKind = pgEnum("topic_kind", [
  "core",
  "recommended",
  "alternative",
  "optional",
]);
export const topicStatus = pgEnum("topic_status", ["not_started", "learning", "done"]);
export const goalStatus = pgEnum("goal_status", ["active", "done", "dropped"]);
export const progressSource = pgEnum("progress_source", ["manual", "roadmap"]);
export const goalTerm = pgEnum("goal_term", ["short", "long"]);
/**
 * A curated identity palette for habit cards — not the app's semantic status
 * colors (done/wip/warn/idle mean something specific everywhere else), so
 * this is deliberately its own small enum rather than reusing `Tone`.
 */
export const habitColor = pgEnum("habit_color", [
  "accent",
  "rose",
  "amber",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
]);
export const mealType = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);
export const weightUnit = pgEnum("weight_unit", ["kg", "lbs"]);

/* -------------------------------------------------------------------------
 * Habits
 * ---------------------------------------------------------------------- */

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /**
   * ISO weekdays this habit is scheduled on: 1 = Monday ... 7 = Sunday (see
   * `isoWeekday` in `src/lib/date.ts`). "Daily" is just all seven days
   * selected — there is no separate cadence model.
   */
  scheduledDays: integer("scheduled_days").array().notNull(),
  color: habitColor("color").notNull().default("accent"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const habitLogs = pgTable(
  "habit_logs",
  {
    id: serial("id").primaryKey(),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    done: boolean("done").notNull().default(true),
  },
  (t) => [unique("habit_logs_habit_date_key").on(t.habitId, t.date)],
);

/* -------------------------------------------------------------------------
 * Roadmaps
 * ---------------------------------------------------------------------- */

export const roadmaps = pgTable("roadmaps", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roadmapTopics = pgTable(
  "roadmap_topics",
  {
    id: serial("id").primaryKey(),
    roadmapId: integer("roadmap_id")
      .notNull()
      .references(() => roadmaps.id, { onDelete: "cascade" }),
    /** Null = top-level group row. Otherwise a leaf topic under that group. */
    parentId: integer("parent_id").references((): AnyPgColumn => roadmapTopics.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    kind: topicKind("kind").notNull().default("core"),
    sortOrder: integer("sort_order").notNull().default(0),
    resourceLink: text("resource_link"),
    status: topicStatus("status").notNull().default("not_started"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // The seed upserts on this key. NULLS NOT DISTINCT so that two top-level
    // groups with the same title collide (Postgres would otherwise treat every
    // NULL parent_id as unique and happily insert duplicates on re-seed).
    unique("roadmap_topics_parent_title_key")
      .on(t.roadmapId, t.parentId, t.title)
      .nullsNotDistinct(),
  ],
);

/* -------------------------------------------------------------------------
 * Goals
 * ---------------------------------------------------------------------- */

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: date("target_date"),
  status: goalStatus("status").notNull().default("active"),
  /** Free-text, user-defined — not a fixed enum, so categories stay idiosyncratic. */
  category: text("category").notNull(),
  term: goalTerm("term").notNull(),
  progressSource: progressSource("progress_source").notNull().default("manual"),
  /** Set when progressSource is `roadmap`; progress is then computed live. */
  roadmapId: integer("roadmap_id").references(() => roadmaps.id, { onDelete: "set null" }),
  manualProgress: integer("manual_progress").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const goalMilestones = pgTable("goal_milestones", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  done: boolean("done").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* -------------------------------------------------------------------------
 * Health (manual quick-log)
 * ---------------------------------------------------------------------- */

export const dailyHealth = pgTable("daily_health", {
  date: date("date").primaryKey(),
  steps: integer("steps"),
  weightKg: real("weight_kg"),
});

/**
 * Sleep gets its own table rather than a `daily_health` column — unlike
 * steps/weight (a single number you type), sleep is logged as bed/wake
 * TIMES, with duration derived from the two. `sleepHours` used to live on
 * `daily_health`; this replaces it, not supplements it, so there's only ever
 * one place sleep duration comes from.
 */
export const sleepLogs = pgTable("sleep_logs", {
  /** The night this log is for — the date you went to bed. */
  date: date("date").primaryKey(),
  bedTime: time("bed_time").notNull(),
  wakeTime: time("wake_time").notNull(),
  /** Derived from bedTime/wakeTime at write time (see `src/lib/sleep.ts`) —
      safe to store because it's a pure function of this row's own other two
      columns, not of anything that can drift out from under it. */
  durationMin: integer("duration_min").notNull(),
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  type: text("type").notNull(),
  durationMin: integer("duration_min").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const foodLogs = pgTable("food_logs", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  item: text("item").notNull(),
  calories: integer("calories"),
  meal: mealType("meal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per log event (a bottle tap or a custom amount), not one row per
 * day — same shape as `foodLogs`/`workouts`. This is what lets a bottle tap
 * and a custom ml amount coexist on the same day and gives per-entry
 * history/delete for free. `amountMl` is resolved and stored at log time, not
 * a live reference to settings, so editing the bottle size later doesn't
 * retroactively change past entries.
 */
/**
 * One row per log event (a bottle tap or a custom amount), not one row per
 * day — same shape as `foodLogs`/`workouts`. This is what lets a bottle tap
 * and a custom ml amount coexist on the same day and gives per-entry
 * history/delete for free. `amountMl` is resolved and stored at log time, not
 * a live reference to settings, so editing the bottle size later doesn't
 * retroactively change past entries.
 */
export const waterLogs = pgTable("water_logs", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  amountMl: integer("amount_ml").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------
 * Tasks
 * ---------------------------------------------------------------------- */

export const taskRecurrence = pgEnum("task_recurrence", [
  "one_off",
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes"),
  /** Free-text, optional — same "datalist, not a fixed enum" call as Goals. */
  category: text("category"),
  recurrence: taskRecurrence("recurrence").notNull().default("one_off"),
  /**
   * The anchor date, meaning depends on `recurrence`:
   *   one_off  -> the due date itself
   *   daily    -> the date the task starts being due (every day from here on)
   *   weekly   -> a start date; WHICH weekdays comes from `scheduledDays`
   *   monthly  -> the day-of-month to recur on (read off this date's day,
   *               clamped to the shorter month when it doesn't have that day)
   *   yearly   -> the month+day to recur on (Feb 29 clamps to Feb 28 outside
   *               leap years)
   * See `src/lib/task-schedule.ts` for the due-date math.
   */
  dueDate: date("due_date").notNull(),
  /** ISO weekdays (1=Mon..7=Sun) — only meaningful when recurrence = 'weekly'.
      Same model as `habits.scheduledDays`, reused rather than reinvented. */
  scheduledDays: integer("scheduled_days").array(),
  /** One-off completion only. Recurring tasks use `taskCompletions` instead —
      "done" is a log entry per occurrence, not a single flag, so completing
      today's instance doesn't erase the task or its history. */
  completedAt: timestamp("completed_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskCompletions = pgTable(
  "task_completions",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    // Mirrors `habit_logs` exactly, `done` included — so toggling a task's
    // check-off reuses the exact same "single INSERT ... ON CONFLICT DO
    // UPDATE SET done = NOT done" pattern `toggleHabit` uses, rather than a
    // presence/absence row that would need an INSERT-or-DELETE branch.
    done: boolean("done").notNull().default(true),
  },
  (t) => [unique("task_completions_task_date_key").on(t.taskId, t.date)],
);

/* -------------------------------------------------------------------------
 * Expense tracker
 * ---------------------------------------------------------------------- */

export const accountType = pgEnum("account_type", ["cash", "bank", "card", "other"]);
export const transactionType = pgEnum("transaction_type", ["income", "expense"]);
export const billRecurrence = pgEnum("bill_recurrence", ["monthly", "yearly"]);

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: accountType("type").notNull().default("cash"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
// Deliberately no stored `balance` column — same rule this app already
// applies to goal/roadmap progress ("computed, never read back as stored
// truth"). A balance derived live from `transactions` can't drift out of
// sync with an edited or deleted transaction; a stored counter could.

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    type: transactionType("type").notNull(),
  },
  (t) => [unique("expense_categories_name_type_key").on(t.name, t.type)],
);

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: transactionType("type").notNull(),
  /** Exact 2-decimal currency amount — `numeric`, not `real`, so it can't
      accumulate floating-point rounding error the way money must not. */
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => expenseCategories.id, { onDelete: "restrict" }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "restrict" }),
  date: date("date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tracked separately from `transactions` by design — a bill due date passing
 * does NOT create a transaction on its own. Marking one "paid this cycle"
 * (see `markBillPaid` in actions.ts) is what creates the real transaction
 * AND advances `dueDate` to the next occurrence, both in one step.
 */
export const recurringBills = pgTable("recurring_bills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => expenseCategories.id, { onDelete: "restrict" }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "restrict" }),
  recurrence: billRecurrence("recurrence").notNull(),
  /**
   * The NEXT upcoming due date — unlike Tasks' immutable anchor, this one
   * mutates forward on payment (see `advanceDueDate` in
   * `src/lib/bill-schedule.ts`). Simpler to reason about ("what does this
   * say right now" always means "when is it next due"), at the cost of a
   * known edge case: a day-of-month that gets clamped in a short month
   * (e.g. 31st -> Feb 28th) doesn't un-clamp itself back to 31 later — it
   * drifts to whatever the clamped day was. Acceptable for a personal
   * tracker; flagged rather than silently accepted.
   */
  dueDate: date("due_date").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One ongoing cap per category, not per specific month — "my Food budget is
    ₹8000", checked against whichever month you're currently looking at. */
export const categoryBudgets = pgTable("category_budgets", {
  categoryId: integer("category_id")
    .primaryKey()
    .references(() => expenseCategories.id, { onDelete: "cascade" }),
  monthlyAmount: numeric("monthly_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
});

/**
 * EMIs/loans — same "tracked separately, due date passing creates nothing on
 * its own" shape as `recurringBills` (see `markEmiPaid` in actions.ts), but
 * with an end: `tenureMonths` installments total, `installmentsPaid` so far.
 * `active` flips to false automatically once the tenure is fully paid off, on
 * top of the same manual pause/resume toggle bills already have.
 *
 * No `categoryId` — unlike bills (arbitrary categories) an EMI payment is
 * always the same kind of expense, so `markEmiPaid` lazily resolves a single
 * shared "EMI Payment" category itself, same pattern as the Balance
 * Adjustment category in actions.ts, rather than asking for one per loan.
 */
export const emis = pgTable("emis", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  principalAmount: numeric("principal_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  emiAmount: numeric("emi_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  tenureMonths: integer("tenure_months").notNull(),
  installmentsPaid: integer("installments_paid").notNull().default(0),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "restrict" }),
  /**
   * The NEXT upcoming due date — same mutable-forward field as
   * `recurringBills.dueDate`, advanced monthly via the same `advanceDueDate`
   * helper on payment. Its day-of-month IS the "due day" from the spec;
   * there's no separate day-of-month column because this field already
   * carries that, plus the full next occurrence for free.
   */
  dueDate: date("due_date").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Savings goals — a target you're setting money aside for in a real account
 * that also holds unrelated money. Progress comes from `goalContributions`,
 * never from the account's own balance (see that table's comment for why).
 */
export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  targetAmount: numeric("target_amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  targetDate: date("target_date"),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "restrict" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * A logged contribution toward a savings goal. Deliberately NEVER inserted
 * into `transactions` — the money already exists in the linked account (it
 * got there through its own income transaction at some point), so recording
 * a contribution as a second real expense/income would double-count it.
 * Instead this is its own ledger: `sum(amount)` per goal is the goal's
 * progress, and `sum(amount)` per account across its active goals is how
 * much of that account's live balance is "earmarked" rather than free (see
 * `listSavingsGoals`/the Savings tab, which compute free = balance −
 * allocated). A dropped/inactive goal's contributions stop counting as
 * allocated, same as an inactive bill stops counting as upcoming.
 */
export const goalContributions = pgTable("goal_contributions", {
  id: serial("id").primaryKey(),
  savingsGoalId: integer("savings_goal_id")
    .notNull()
    .references(() => savingsGoals.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  date: date("date").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------
 * Journal — one free-text note per day
 * ---------------------------------------------------------------------- */

export const journalEntries = pgTable("journal_entries", {
  date: date("date").primaryKey(),
  text: text("text").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------
 * Settings — a single row, this app has exactly one user
 * ---------------------------------------------------------------------- */

export const appSettings = pgTable("app_settings", {
  /** Always 1 — enforced in code (see settings queries), not a DB constraint;
      a CHECK(id = 1) would work too but this is simpler for one guaranteed row. */
  id: integer("id").primaryKey().default(1),
  calorieGoal: integer("calorie_goal"),
  bottleSizeMl: integer("bottle_size_ml").notNull().default(500),
  dailyWaterGoalMl: integer("daily_water_goal_ml").notNull().default(2500),
  weightUnit: weightUnit("weight_unit").notNull().default("kg"),
});

/* -------------------------------------------------------------------------
 * Inferred types
 * ---------------------------------------------------------------------- */

export type Habit = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
export type Roadmap = typeof roadmaps.$inferSelect;
export type RoadmapTopic = typeof roadmapTopics.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type GoalMilestone = typeof goalMilestones.$inferSelect;
export type DailyHealth = typeof dailyHealth.$inferSelect;
export type SleepLog = typeof sleepLogs.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type FoodLog = typeof foodLogs.$inferSelect;
export type WaterLog = typeof waterLogs.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type RecurringBill = typeof recurringBills.$inferSelect;
export type CategoryBudget = typeof categoryBudgets.$inferSelect;
export type Emi = typeof emis.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type GoalContribution = typeof goalContributions.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type AppSettings = typeof appSettings.$inferSelect;
