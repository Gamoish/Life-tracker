import { PageHeader } from "@/components/ui";
import { formatShort, today } from "@/lib/date";
import { listActiveTasks } from "./queries";
import TaskView from "./TaskView";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const day = today();
  const tasks = await listActiveTasks();

  // Distinct non-empty categories, for the filter/datalist — same pattern as
  // Goals' category input.
  const categories = [...new Set(tasks.map((t) => t.category).filter((c): c is string => !!c))].sort();

  return (
    <>
      <PageHeader title="Tasks" subtitle={formatShort(day)} />
      <TaskView tasks={tasks} categories={categories} today={day} />
    </>
  );
}
