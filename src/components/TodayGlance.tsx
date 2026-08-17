import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { goals, habitLogs, habits } from "@/db/schema";
import { today } from "@/lib/date";
import { ProgressBar } from "./ui";

/**
 * The sidebar's "today at a glance" — three numbers that answer "what is left
 * today?" without leaving the page you're on.
 *
 * Read-only and additive: it counts rows, it never writes and never feeds any
 * module's own maths. Deliberately carries no `data-testid`s, so it can't
 * collide with the per-module selectors the e2e suites match on.
 */

const total = sql<number>`count(*)::int`;

export default async function TodayGlance() {
  const day = today();

  const [activeHabits, checkedToday, activeGoals] = await Promise.all([
    db.select({ n: total }).from(habits).where(eq(habits.active, true)),
    db
      .select({ n: total })
      .from(habitLogs)
      .innerJoin(habits, eq(habitLogs.habitId, habits.id))
      .where(
        and(
          eq(habitLogs.date, day),
          eq(habitLogs.done, true),
          eq(habits.active, true),
        ),
      ),
    db.select({ n: total }).from(goals).where(eq(goals.status, "active")),
  ]);

  const habitTotal = activeHabits[0]?.n ?? 0;
  const habitDone = checkedToday[0]?.n ?? 0;
  const habitPct = habitTotal === 0 ? 0 : (habitDone / habitTotal) * 100;

  return (
    <section aria-label="Today at a glance" className="space-y-3">
      <h2 className="text-2xs font-semibold uppercase tracking-[0.14em] text-faint">
        Today at a glance
      </h2>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted">Habits</span>
          <span className="font-mono text-xs tabular-nums text-ink">
            {habitDone}
            <span className="text-faint">/{habitTotal}</span>
          </span>
        </div>
        <ProgressBar value={habitPct} tone={habitDone === habitTotal && habitTotal > 0 ? "done" : "accent"} />
      </div>

      <dl className="space-y-1.5 text-xs">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-muted">Active goals</dt>
          <dd className="font-mono tabular-nums text-ink">{activeGoals[0]?.n ?? 0}</dd>
        </div>
      </dl>
    </section>
  );
}
