import { formatShort, today } from "@/lib/date";
import TaskBell from "@/app/(app)/tasks/TaskBell";
import type { DueTaskSummary } from "@/app/(app)/tasks/queries";
import SettingsLink from "@/app/(app)/settings/SettingsLink";
import SidebarNav from "./SidebarNav";
import TodayGlance from "./TodayGlance";

/**
 * Desktop shell. `hidden md:flex` means `display: none` below the breakpoint —
 * which also drops it out of the accessibility tree, so it and the mobile tab
 * bar are never both exposed.
 */
export default function Sidebar({ dueTasks }: { dueTasks: DueTaskSummary[] }) {
  return (
    <aside className="hidden border-r border-line bg-surface md:sticky md:top-0 md:flex md:h-dvh md:flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <Mark />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold leading-tight tracking-tight">
            Tracker
          </p>
          <p className="font-mono text-2xs leading-tight text-faint">
            {formatShort(today())}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <SettingsLink />
          <TaskBell items={dueTasks} placement="sidebar" />
        </div>
      </div>

      <SidebarNav />

      <div className="mt-auto border-t border-line px-5 py-5">
        <TodayGlance />
      </div>
    </aside>
  );
}

/** Nine cells on a lit ramp — the heatmap, shrunk to a monogram. */
function Mark() {
  const lit = [0, 2, 4, 1, 3, 2, 4, 1, 3];
  return (
    <span
      aria-hidden
      className="grid shrink-0 grid-cols-3 gap-[2px] rounded-md border border-line bg-canvas p-1 shadow-[0_0_18px_-5px_rgba(247,138,4,0.6)]"
    >
      {lit.map((level, i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-[1px]"
          style={{ backgroundColor: `var(--c-heat-${level})` }}
        />
      ))}
    </span>
  );
}
