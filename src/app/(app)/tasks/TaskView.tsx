"use client";

import { startTransition, useActionState, useOptimistic, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Button,
  Card,
  CheckMark,
  Disclosure,
  EmptyState,
  Field,
  Input,
  Pill,
  SectionHeader,
  Select,
  TextButton,
  Textarea,
} from "@/components/ui";
import { IconAdd, IconGrip } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { addDays, formatShort, weekBounds } from "@/lib/date";
import { isDueOn, isOverdue, type TaskRecurrence } from "@/lib/task-schedule";
import DayPicker, { formatScheduledDays } from "../habits/DayPicker";
import {
  addTask,
  deleteTask,
  moveTaskDate,
  quickAddTask,
  toggleTask,
  updateTask,
  type FormState,
} from "./actions";
import type { TaskWithCompletions } from "./queries";

/** The four drop targets in the Plan grid — see `TaskView`'s column setup. */
type ColumnId = "today" | "this-week" | "next-week" | "upcoming";

/**
 * dnd-kit's Mouse/Touch sensors abort an in-progress drag on *any* `resize`
 * or `visibilitychange` event on `window` — not just an actual viewport size
 * change. A scrollbar toggling as the dragged row's column grows, or (on
 * mobile, where this page actually lives) Safari's toolbar auto-hiding as
 * the page scrolls, both fire a `resize` event with the dimensions
 * unchanged, silently cancelling the drag before `onDragEnd` ever runs —
 * verified against this exact page with a scripted drag; see
 * https://github.com/clauderic/dnd-kit/issues/686 for the same failure mode.
 * Both sensors bind that listener to `this.handleCancel` inside their own
 * constructor before ours runs, so removing it right after `super()`, using
 * that same bound reference, is the narrowest fix — Escape-to-cancel and a
 * real pointercancel/touchcancel still work, since those are separate
 * listeners this doesn't touch. `handleCancel` is typed `private` in
 * dnd-kit's `.d.ts` (it's an ordinary runtime property, not a JS `#private`
 * field), hence the `any` cast — TypeScript's privacy, not a real one.
 */
class ResizeSafeMouseSensor extends MouseSensor {
  constructor(props: ConstructorParameters<typeof MouseSensor>[0]) {
    super(props);
    window.removeEventListener("resize", (this as any).handleCancel);
    document.removeEventListener("visibilitychange", (this as any).handleCancel);
  }
}

class ResizeSafeTouchSensor extends TouchSensor {
  constructor(props: ConstructorParameters<typeof TouchSensor>[0]) {
    super(props);
    window.removeEventListener("resize", (this as any).handleCancel);
    document.removeEventListener("visibilitychange", (this as any).handleCancel);
  }
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

function occursInRange(task: TaskWithCompletions, start: string, end: string): boolean {
  if (task.recurrence === "one_off") return task.dueDate >= start && task.dueDate <= end;
  for (let day = start; day <= end; day = addDays(day, 1)) if (isDueOn(task, day)) return true;
  return false;
}

type TaskStatus = { done: boolean; overdue: boolean; dueToday: boolean };

function summarize(task: TaskWithCompletions, today: string): TaskStatus {
  if (task.recurrence === "one_off") {
    return {
      done: task.completedAt !== null,
      overdue: task.completedAt === null && task.dueDate < today,
      dueToday: task.dueDate === today,
    };
  }
  return {
    done: task.completedDates.includes(today),
    overdue: isOverdue(task, task.completedDates, today),
    dueToday: isDueOn(task, today),
  };
}

function formatRecurrence(task: TaskWithCompletions): string {
  switch (task.recurrence) {
    case "one_off":
      return `Due ${formatShort(task.dueDate)}`;
    case "daily":
      return "Daily";
    case "weekly":
      return `Weekly · ${formatScheduledDays(task.scheduledDays ?? [])}`;
    case "monthly":
      return `Monthly · day ${Number(task.dueDate.split("-")[2])}`;
    case "yearly": {
      const [, m, d] = task.dueDate.split("-").map(Number);
      const label = new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
      }).format(new Date(Date.UTC(2000, m - 1, d)));
      return `Yearly · ${label}`;
    }
  }
}

export default function TaskView({
  tasks,
  categories,
  today,
}: {
  tasks: TaskWithCompletions[];
  categories: string[];
  today: string;
}) {
  type OptimisticAction =
    | { type: "toggle"; id: number }
    | { type: "move"; id: number; dueDate: string };

  const [optimistic, applyOptimistic] = useOptimistic(
    tasks,
    (state: TaskWithCompletions[], action: OptimisticAction) => {
      if (action.type === "move") {
        return state.map((t) => (t.id === action.id ? { ...t, dueDate: action.dueDate } : t));
      }
      return state.map((t) => {
        if (t.id !== action.id) return t;
        if (t.recurrence === "one_off") {
          return { ...t, completedAt: t.completedAt ? null : new Date().toISOString() };
        }
        return {
          ...t,
          completedDates: t.completedDates.includes(today)
            ? t.completedDates.filter((d) => d !== today)
            : [...t.completedDates, today],
        };
      });
    },
  );

  const rowsFor = (start: string, end: string) => {
    const rows = optimistic.filter((t) => occursInRange(t, start, end)).map((task) => ({ task, status: summarize(task, today) }));
    return rows.sort((a, b) => {
      const rank = (s: TaskStatus) => (s.overdue ? 0 : s.done ? 2 : 1);
      return rank(a.status) - rank(b.status) || a.task.dueDate.localeCompare(b.task.dueDate);
    });
  };

  const [, weekEnd] = weekBounds(today);
  const tomorrow = addDays(today, 1);
  const nextWeekStart = addDays(weekEnd, 1);
  const nextWeekEnd = addDays(nextWeekStart, 6);
  const todayRows = rowsFor(today, today);
  const thisWeekRows = tomorrow > weekEnd ? [] : rowsFor(tomorrow, weekEnd);
  const nextWeekRows = rowsFor(nextWeekStart, nextWeekEnd);
  const upcomingRows = optimistic.filter((t) => t.recurrence === "one_off" && t.dueDate > nextWeekEnd).map((task) => ({ task, status: summarize(task, today) }));

  // Which column a task is *currently* showing in — reusing the rows already
  // computed above rather than re-deriving the date-range math, so this can
  // never disagree with what's actually on screen.
  const columnOf = new Map<number, ColumnId>();
  for (const { task } of todayRows) columnOf.set(task.id, "today");
  for (const { task } of thisWeekRows) columnOf.set(task.id, "this-week");
  for (const { task } of nextWeekRows) columnOf.set(task.id, "next-week");
  for (const { task } of upcomingRows) columnOf.set(task.id, "upcoming");

  // The due date a task adopts when dropped on each column. "This week" has
  // no valid slot on the one day tomorrow spills past the week (today is the
  // week's last day) — that column is a disabled drop target that day.
  const columnTarget: Record<ColumnId, string | null> = {
    today,
    "this-week": tomorrow > weekEnd ? null : tomorrow,
    "next-week": nextWeekStart,
    upcoming: addDays(nextWeekEnd, 1),
  };
  const columnLabel: Record<ColumnId, string> = {
    today: "Today",
    "this-week": "This week",
    "next-week": "Next week",
    upcoming: "Upcoming",
  };

  function toggle(task: TaskWithCompletions) {
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id: task.id });
      await toggleTask(task.id, task.recurrence);
    });
  }

  const toast = useToast();
  const [activeId, setActiveId] = useState<number | null>(null);
  const activeTask = activeId !== null ? (optimistic.find((t) => t.id === activeId) ?? null) : null;

  const sensors = useSensors(
    useSensor(ResizeSafeMouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(ResizeSafeTouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const overId = event.over?.id;
    if (typeof overId !== "string") return;
    const column = overId as ColumnId;
    const targetDate = columnTarget[column];
    if (!targetDate) return;

    const taskId = Number(event.active.id);
    if (columnOf.get(taskId) === column) return;
    const task = optimistic.find((t) => t.id === taskId);
    if (!task) return;

    toast(`${task.title} · moved to ${columnLabel[column]}`, "accent");
    startTransition(async () => {
      applyOptimistic({ type: "move", id: taskId, dueDate: targetDate });
      await moveTaskDate(taskId, targetDate);
    });
  }

  return (
    <>
      <QuickAddBar />

      <SectionHeader title="Plan" right={<span className="font-mono text-xs">{todayRows.length} today</span>} className="mt-6" />
      <DndContext
        sensors={sensors}
        onDragStart={(event: DragStartEvent) => setActiveId(Number(event.active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <TaskColumn columnId="today" title="Today" subtitle={formatShort(today)} rows={todayRows} onToggle={toggle} />
          <TaskColumn
            columnId="this-week"
            dropDisabled={columnTarget["this-week"] === null}
            title="This week"
            subtitle={`${formatShort(tomorrow)} – ${formatShort(weekEnd)}`}
            rows={thisWeekRows}
            onToggle={toggle}
          />
          <TaskColumn columnId="next-week" title="Next week" subtitle={`${formatShort(nextWeekStart)} – ${formatShort(nextWeekEnd)}`} rows={nextWeekRows} onToggle={toggle} />
        </div>
        <TaskColumn columnId="upcoming" title="Upcoming" subtitle="Later one-off tasks" rows={upcomingRows} onToggle={toggle} className="mt-6" />

        <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
          {activeTask && <DragPreview task={activeTask} />}
        </DragOverlay>
      </DndContext>

      <AddTaskForm categories={categories} today={today} className="mt-6" />
    </>
  );
}

function DragPreview({ task }: { task: TaskWithCompletions }) {
  return (
    <div className="flex items-center gap-2 rounded-card border border-accent bg-surface px-3.5 py-2.5 shadow-lg shadow-black/20">
      <IconGrip className="h-4 w-4 shrink-0 text-accent" />
      <span className="truncate text-sm font-medium">{task.title}</span>
    </div>
  );
}

function TaskColumn({
  title,
  subtitle,
  rows,
  onToggle,
  columnId,
  dropDisabled = false,
  className = "",
}: {
  title: string;
  subtitle: string;
  rows: { task: TaskWithCompletions; status: TaskStatus }[];
  onToggle: (task: TaskWithCompletions) => void;
  columnId: ColumnId;
  dropDisabled?: boolean;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId, disabled: dropDisabled });
  const highlight = isOver && !dropDisabled;

  return (
    <section
      ref={setNodeRef}
      className={`min-w-0 rounded-card border p-3 transition-colors ${highlight ? "border-accent bg-accent-soft" : "border-line bg-surface/50"} ${className}`}
    >
      <header className="mb-3 border-b border-line pb-2">
        <h2 className="font-display text-sm font-semibold tracking-tight">{title}</h2>
        <p className="font-mono text-2xs text-faint">{subtitle}</p>
      </header>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-faint">No tasks planned</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(({ task, status }) => (
            <TaskRow key={task.id} task={task} status={status} onToggle={() => onToggle(task)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function QuickAddBar() {
  const [state, action] = useActionState<FormState, FormData>(quickAddTask, {});

  return (
    <div>
      <form action={action} data-testid="quick-add-task-form" className="flex gap-2">
        <Input
          name="title"
          required
          placeholder="Quick-add a task for today, then press Enter"
          aria-label="Quick add task"
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="primary" className="shrink-0">
          Add
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="mt-1.5 text-xs text-warn">
          {state.error}
        </p>
      )}
    </div>
  );
}

function TaskRow({
  task,
  status,
  onToggle,
}: {
  task: TaskWithCompletions;
  status: TaskStatus;
  onToggle: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const toast = useToast();

  // Only one-off tasks have a `dueDate` that means "when it's shown" — a
  // recurring task's is a recurrence anchor, so dragging it between columns
  // wouldn't reschedule it, just quietly corrupt its rule (see actions.ts).
  const draggable = task.recurrence === "one_off";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: !draggable,
  });

  return (
    <li ref={setNodeRef} className={isDragging ? "opacity-30" : ""}>
      <Card
        className="p-3.5"
        data-testid="task-row"
        data-title={task.title}
        data-recurrence={task.recurrence}
        data-done={status.done ? "true" : "false"}
        data-overdue={status.overdue ? "true" : "false"}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            disabled={!draggable}
            {...(draggable ? listeners : {})}
            {...(draggable ? attributes : {})}
            aria-label={draggable ? `Drag ${task.title} to reschedule` : "Recurring tasks can't be dragged — edit to reschedule"}
            title={draggable ? undefined : "Recurring tasks recur automatically — edit to reschedule"}
            className={`mt-0.5 flex h-6 w-5 shrink-0 items-center justify-center rounded ${
              draggable
                ? "cursor-grab touch-none text-faint transition-colors hover:text-accent active:cursor-grabbing"
                : "cursor-default text-faint/25"
            }`}
          >
            <IconGrip className="h-4 w-4" />
          </button>

          <button
            key={status.done ? "done" : "undone"}
            type="button"
            aria-pressed={status.done}
            aria-label={status.done ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
            onClick={() => {
              if (!status.done) toast(`${task.title} · done`, "done");
              onToggle();
            }}
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
              status.done
                ? "pop-in scale-100 border-done bg-done text-canvas shadow-[0_0_12px_-1px_rgba(84,203,126,0.65)]"
                : "scale-90 border-line-strong text-transparent hover:scale-100 hover:border-accent"
            }`}
          >
            <CheckMark className="h-3 w-3" />
          </button>

          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm font-medium ${status.done ? "text-faint line-through" : ""}`}>
              {task.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-2xs text-faint">{formatRecurrence(task)}</span>
              {task.category && <Pill tone="neutral">{task.category}</Pill>}
              {status.overdue && <Pill tone="warn">Overdue</Pill>}
              {status.dueToday && !status.done && !status.overdue && <Pill tone="accent">Today</Pill>}
            </div>
            {task.notes && <p className="mt-1 text-xs text-muted">{task.notes}</p>}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <TextButton onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit"}</TextButton>
            <TextButton
              tone="warn"
              data-testid="delete-task"
              onClick={() =>
                startTransition(async () => {
                  await deleteTask(task.id);
                  toast("Task deleted", "warn");
                })
              }
            >
              Delete
            </TextButton>
          </div>
        </div>

        {editing && <EditTaskForm task={task} />}
      </Card>
    </li>
  );
}

function RecurrenceFields({
  recurrence,
  setRecurrence,
  dueDate,
  scheduledDays,
}: {
  recurrence: TaskRecurrence;
  setRecurrence: (r: TaskRecurrence) => void;
  dueDate: string;
  scheduledDays: number[];
}) {
  return (
    <>
      <div className="flex gap-2">
        <Field label="Due date" className="min-w-0 flex-1">
          <Input name="dueDate" type="date" defaultValue={dueDate} required />
        </Field>
        <Field label="Recurrence" className="w-40 shrink-0">
          <Select
            name="recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
          >
            <option value="one_off">One-off</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>
        </Field>
      </div>
      {recurrence === "weekly" && (
        <DayPicker defaultValue={scheduledDays} ariaLabel="Scheduled weekdays" />
      )}
      {recurrence === "monthly" && (
        <p className="text-2xs text-faint">Recurs on day {Number(dueDate.split("-")[2] || 1)} of every month.</p>
      )}
      {recurrence === "yearly" && (
        <p className="text-2xs text-faint">Recurs every year on this date.</p>
      )}
    </>
  );
}

function AddTaskForm({
  categories,
  today,
  className = "",
}: {
  categories: string[];
  today: string;
  className?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(addTask, {});
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("one_off");

  return (
    <Disclosure label="+ Add task" className={className}>
      {/* One datalist for the whole page, same pattern as Goals' categories. */}
      <datalist id="task-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <form action={action} data-testid="add-task-form" className="max-w-xl space-y-2">
        <Input name="title" required placeholder="Task title" aria-label="Title" />
        <RecurrenceFields
          recurrence={recurrence}
          setRecurrence={setRecurrence}
          dueDate={today}
          scheduledDays={ALL_DAYS}
        />
        <div className="flex gap-2">
          <Input
            name="category"
            list="task-categories"
            placeholder="Category (optional)"
            aria-label="Category"
            className="min-w-0 flex-1"
          />
        </div>
        <Textarea name="notes" placeholder="Notes (optional)" aria-label="Notes" rows={2} />
        <Button type="submit" variant="primary" size="lg">
          Add task
        </Button>
        {state.error && (
          <p role="alert" className="text-xs text-warn">
            {state.error}
          </p>
        )}
      </form>
    </Disclosure>
  );
}

function EditTaskForm({ task }: { task: TaskWithCompletions }) {
  const [state, action] = useActionState<FormState, FormData>(updateTask, {});
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(task.recurrence);

  return (
    <form action={action} className="mt-3 space-y-2 border-t border-line pt-3">
      <input type="hidden" name="id" value={task.id} />
      <Input name="title" defaultValue={task.title} required aria-label="Title" />
      <RecurrenceFields
        recurrence={recurrence}
        setRecurrence={setRecurrence}
        dueDate={task.dueDate}
        scheduledDays={task.scheduledDays ?? ALL_DAYS}
      />
      <Input
        name="category"
        list="task-categories"
        defaultValue={task.category ?? ""}
        placeholder="Category (optional)"
        aria-label="Category"
      />
      <Textarea name="notes" defaultValue={task.notes ?? ""} placeholder="Notes (optional)" aria-label="Notes" rows={2} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" className="shrink-0">
          Save
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="text-xs text-warn">
          {state.error}
        </p>
      )}
    </form>
  );
}
