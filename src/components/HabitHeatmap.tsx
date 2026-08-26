import { buildHeatmap } from "@/lib/heatmap";
import { isScheduledDay } from "@/lib/habit-streak";
import { formatShort } from "@/lib/date";
import { HABIT_COLOR_BG, type HabitColor } from "@/app/(app)/habits/habit-color";

/**
 * A single habit's own calendar — the same GitHub-style weekly grid as
 * `Heatmap`, but scoped to ONE habit and tinted in that habit's identity
 * colour instead of the shared amber ramp, so a wall of them stays legible.
 *
 * A habit is done at most once a day, so there's no 0–4 intensity ramp here —
 * each cell is one of three states, which is what makes a fixed weekly schedule
 * readable at a glance:
 *   - done            → filled in the habit's colour
 *   - due, not done   → a faint "missed" slot (present, but empty)
 *   - not scheduled   → a ghost cell (barely there), never counted as missed —
 *                       the same rule the streak maths already applies.
 *
 * Presentation only: it derives everything from the `doneDates` the page
 * already fetched in one query, so rendering one per habit costs no extra
 * round-trips.
 */
export default function HabitHeatmap({
  doneDates,
  scheduledDays,
  color,
  today,
  weeks = 26,
}: {
  doneDates: string[];
  scheduledDays: number[];
  color: HabitColor;
  today: string;
  weeks?: number;
}) {
  const grid = buildHeatmap(doneDates, today, weeks);
  const done = new Set(doneDates.map((d) => d.slice(0, 10)));

  return (
    <div dir="rtl" className="min-w-0 overflow-x-auto pb-1">
      <div dir="ltr" className="inline-block min-w-full">
        <div
          role="img"
          aria-label={`${grid.total} check-offs in the ${weeks} weeks to ${formatShort(today)}, across ${grid.activeDays} days.`}
          className="flex gap-[3px]"
        >
          {grid.weeks.map((week) => (
            <div key={week.start} className="grid grid-rows-7 gap-[3px]">
              {week.days.map((day, i) => {
                if (day === null) return <span key={i} className="h-2.5 w-2.5" />;

                const isDone = done.has(day.date);
                const scheduled = isScheduledDay(scheduledDays, day.date);

                if (isDone) {
                  return (
                    <span
                      key={day.date}
                      title={`Done · ${formatShort(day.date)}`}
                      className={`h-2.5 w-2.5 rounded-[3px] ${HABIT_COLOR_BG[color]} transition-transform hover:scale-125`}
                    />
                  );
                }
                if (scheduled) {
                  return (
                    <span
                      key={day.date}
                      title={`Missed · ${formatShort(day.date)}`}
                      className="h-2.5 w-2.5 rounded-[3px] bg-heat-0 ring-1 ring-inset ring-line/50"
                    />
                  );
                }
                return (
                  <span
                    key={day.date}
                    title={`Off day · ${formatShort(day.date)}`}
                    className="h-2.5 w-2.5 rounded-[3px] ring-1 ring-inset ring-line/25"
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
