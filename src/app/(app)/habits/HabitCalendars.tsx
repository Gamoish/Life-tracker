import { Card, EmptyState } from "@/components/ui";
import HabitHeatmap from "@/components/HabitHeatmap";
import { IconAdd, IconFlame } from "@/components/icons";
import { HABIT_COLOR_BG, HABIT_COLOR_TEXT, type HabitColor } from "./habit-color";

export type HabitCalendar = {
  id: number;
  name: string;
  color: HabitColor;
  scheduledDays: number[];
  doneDates: string[];
  streak: number;
};

/**
 * One calendar card per active habit, below the combined consistency grid —
 * each in its own colour, so the wall of them reads as distinct rhythms rather
 * than one undifferentiated block. Streak sits in the header beside the name,
 * as the mockup asks.
 */
export default function HabitCalendars({
  habits,
  today,
}: {
  habits: HabitCalendar[];
  today: string;
}) {
  if (habits.length === 0) {
    return (
      <EmptyState
        icon={<IconAdd />}
        title="No habits to chart yet"
        hint="Add one below and its calendar shows up here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {habits.map((h) => (
        <Card key={h.id} className="p-4" data-testid="habit-calendar" data-name={h.name}>
          <header className="mb-3 flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${HABIT_COLOR_BG[h.color]}`} />
              <span className="truncate">{h.name}</span>
            </p>
            <span className="flex shrink-0 items-center gap-1.5">
              <IconFlame className={`h-3.5 w-3.5 ${h.streak > 0 ? HABIT_COLOR_TEXT[h.color] : "text-faint"}`} />
              <span className={`font-mono text-sm font-bold tabular-nums ${h.streak > 0 ? HABIT_COLOR_TEXT[h.color] : "text-faint"}`}>
                {h.streak}
              </span>
              <span className="text-2xs uppercase tracking-wide text-faint">day</span>
            </span>
          </header>
          <HabitHeatmap
            doneDates={h.doneDates}
            scheduledDays={h.scheduledDays}
            color={h.color}
            today={today}
          />
        </Card>
      ))}
    </div>
  );
}
