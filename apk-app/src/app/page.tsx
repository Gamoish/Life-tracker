"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, SectionHeader, Skeleton, StatTile } from "@/components/ui";
import { initDatabase } from "@/db/client";
import HabitCheckList, { type HabitNode } from "@/features/habits/HabitCheckList";
import HabitManager, { type ManagedHabit } from "@/features/habits/HabitManager";
import { listHabitsWithLogs, type HabitWithLogs } from "@/features/habits/queries";
import { formatShort, today } from "@/lib/date";
import { isScheduledDay } from "@/lib/habit-streak";

/**
 * The single screen this step proves out. There is no server render here —
 * everything (DB init, the initial fetch, every mutation) happens on the
 * client, against the on-device SQLite DB, which is why this is a client
 * component from the top rather than a server component fetching props.
 */
export default function HabitsPage() {
  const [ready, setReady] = useState(false);
  const [habitRows, setHabitRows] = useState<HabitWithLogs[]>([]);
  const day = today();

  const refresh = useCallback(async () => {
    setHabitRows(await listHabitsWithLogs());
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await initDatabase();
      if (cancelled) return;
      await refresh();
      if (cancelled) return;
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  if (!ready) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <PageHeader title="Habits" subtitle={formatShort(day)} />
        <div className="space-y-2" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading…</span>
          <Skeleton className="h-16 w-full rounded-card" />
          <Skeleton className="h-16 w-full rounded-card" />
          <Skeleton className="h-16 w-full rounded-card" />
        </div>
      </main>
    );
  }

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

  const dueToday = activeHabits.filter((h) => isScheduledDay(h.scheduledDays, day));
  const doneToday = dueToday.filter((h) => h.doneDates.includes(day)).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <PageHeader
        title="Habits"
        subtitle={formatShort(day)}
        action={
          <StatTile
            label="Today"
            value={`${doneToday}/${dueToday.length}`}
            tone={dueToday.length > 0 && doneToday === dueToday.length ? "done" : "neutral"}
            hint="Habits checked"
          />
        }
      />

      <SectionHeader title="Today" right={`${doneToday} of ${dueToday.length}`} />
      <HabitCheckList habits={checkList} today={day} onChanged={refresh} />

      <SectionHeader title="Manage" className="mt-8" />
      <HabitManager habits={managed} onChanged={refresh} />
    </main>
  );
}
