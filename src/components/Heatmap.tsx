import type { Heatmap as HeatmapData } from "@/lib/heatmap";
import { formatShort } from "@/lib/date";

/**
 * The daily-consistency grid.
 *
 * Presentation only — every number comes pre-computed from the pure
 * `src/lib/heatmap.ts`, so this file never decides what a level means.
 *
 * Accessibility: 360-odd individually-labelled cells would be unusable with a
 * screen reader, so the grid is one `role="img"` with a summary label and the
 * cells are hidden. Sighted users get a native tooltip per day; everyone gets
 * the same totals in the caption.
 */

const LEVEL_CLASS = [
  "bg-heat-0",
  "bg-heat-1",
  "bg-heat-2",
  "bg-heat-3",
  "bg-heat-4",
] as const;

const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", ""];

export default function Heatmap({
  data,
  label = "Daily activity",
}: {
  data: HeatmapData;
  label?: string;
}) {
  const summary = `${label}: ${data.total} in the ${data.weeks.length} weeks to ${formatShort(data.end)}, across ${data.activeDays} active days.`;

  return (
    <div>
      <div className="flex gap-1.5">
        {/* Outside the scroller on purpose: parked at the right on a narrow
            screen, an axis inside it would have scrolled out of sight. `pt-5`
            clears the month row that scrolls alongside the grid. */}
        <div
          aria-hidden
          className="grid w-7 shrink-0 grid-rows-7 gap-[3px] pt-5"
        >
          {WEEKDAYS.map((day, i) => (
            <span
              key={i}
              className="font-mono text-[0.5625rem] leading-3 text-faint"
            >
              {day}
            </span>
          ))}
        </div>

        {/* `dir="rtl"` is what parks the view at the RIGHT edge on a narrow
            screen — the most recent weeks are the ones worth seeing first. The
            content is flipped back to ltr so it still reads oldest-to-newest. */}
        <div dir="rtl" className="min-w-0 flex-1 overflow-x-auto pb-1">
          {/* `min-w-full` is load-bearing: when the grid is narrower than the
              card it stretches to fill, so the ltr content stays pinned to the
              left instead of being flung to the right by the rtl parent. When
              the grid IS wider, this has no effect and rtl parks the scroll at
              the most recent week. */}
          <div dir="ltr" className="inline-block min-w-full">
            {/* Month axis */}
            <div className="mb-1 flex h-4">
              {data.weeks.map((week, i) => {
                const month = data.months.find((m) => m.index === i);
                return (
                  <div key={week.start} className="w-[15px] shrink-0">
                    {month && (
                      <span className="font-mono text-2xs leading-4 text-faint">
                        {month.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div role="img" aria-label={summary} className="flex gap-[3px]">
              {data.weeks.map((week) => (
                <div key={week.start} className="grid grid-rows-7 gap-[3px]">
                  {week.days.map((day, i) =>
                    day === null ? (
                      <span key={i} className="h-3 w-3" />
                    ) : (
                      <span
                        key={day.date}
                        title={`${day.count === 0 ? "Nothing" : day.count} on ${formatShort(day.date)}`}
                        className={`h-3 w-3 rounded-[3px] ring-1 ring-inset ring-line/40 transition-all hover:scale-125 hover:ring-ink/60 ${LEVEL_CLASS[day.level]} ${
                          day.level === 4 ? "shadow-[0_0_8px_-1px_rgba(231,164,75,0.8)]" : ""
                        }`}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-xs text-muted">
          <span className="font-mono font-semibold tabular-nums text-ink">
            {data.total}
          </span>{" "}
          in the last {data.weeks.length} weeks ·{" "}
          <span className="font-mono tabular-nums">{data.activeDays}</span> active
          days
        </p>
        <Legend />
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-2xs text-faint">
      <span>Less</span>
      {LEVEL_CLASS.map((cls) => (
        <span
          key={cls}
          aria-hidden
          className={`h-3 w-3 rounded-[3px] ring-1 ring-inset ring-line/40 ${cls}`}
        />
      ))}
      <span>More</span>
    </div>
  );
}
