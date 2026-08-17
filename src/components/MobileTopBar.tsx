import TaskBell from "@/app/(app)/tasks/TaskBell";
import type { DueTaskSummary } from "@/app/(app)/tasks/queries";

/**
 * Mobile only — `md:hidden` drops it (and its accessibility-tree presence)
 * above the `md` breakpoint, where `Sidebar` renders the same bell instead.
 *
 * Fixed at the top so the bell is reachable with one thumb-stretch regardless
 * of scroll position, and so it stops competing with the bottom bar's tap
 * targets. `AppLayout` pads `<main>` to clear this bar's height.
 */
export default function MobileTopBar({ dueTasks }: { dueTasks: DueTaskSummary[] }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex justify-end border-b border-line bg-surface/90 px-4 pt-[calc(0.625rem+env(safe-area-inset-top))] pb-2.5 backdrop-blur-md md:hidden">
      <TaskBell items={dueTasks} />
    </header>
  );
}
