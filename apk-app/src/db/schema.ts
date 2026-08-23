import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

/**
 * Habits only, for this step — ported from the web app's Postgres schema
 * (`src/db/schema.ts` in the root project) into Drizzle's SQLite dialect.
 *
 * `scheduledDays` was a native Postgres `integer[]` there; SQLite has no
 * array type, so it's stored as a JSON text column instead and typed back to
 * `number[]` at the Drizzle layer via `{ mode: "json" }` — same values
 * (ISO weekdays, 1 = Monday … 7 = Sunday), same "daily = all seven" model,
 * just a different wire format.
 *
 * `active`/`done` were Postgres `boolean`; SQLite has no boolean type either,
 * so `{ mode: "boolean" }` stores them as 0/1 integers and converts back.
 */

export const HABIT_COLORS = [
  "accent",
  "rose",
  "amber",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
] as const;

export const habits = sqliteTable("habits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  scheduledDays: text("scheduled_days", { mode: "json" }).notNull().$type<number[]>(),
  color: text("color").notNull().default("accent"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const habitLogs = sqliteTable(
  "habit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    done: integer("done", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [unique("habit_logs_habit_date_key").on(t.habitId, t.date)],
);

export type Habit = typeof habits.$inferSelect;
export type HabitLog = typeof habitLogs.$inferSelect;
