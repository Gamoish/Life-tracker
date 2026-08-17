"use client";

import { startTransition, useActionState, useMemo, useOptimistic, useState } from "react";
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
  SegmentedControl,
  Select,
  TextButton,
  Textarea,
} from "@/components/ui";
import { IconAdd } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { formatShort, monthBounds, weekBounds, yearBounds } from "@/lib/date";
import { isDueOn, isOverdue, type TaskRecurrence } from "@/lib/task-schedule";
import DayPicker, { formatScheduledDays } from "../habits/DayPicker";
import {
  addTask,
  deleteTask,
  quickAddTask,
  toggleTask,
  updateTask,
  type FormState,
} from "./actions";
import type { TaskWithCompletions } from "./queries";

const TABS = ["daily", "weekly", "monthly", "yearly"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

/** A one-off task belongs on a tab if its due date falls in that tab's current period. */
function inTab(task: TaskWithCompletions, tab: Tab, today: string): boolean {
  if (task.recurrence === tab) return true;
  if (task.recurrence !== "one_off") return false;

  const [start, end] =
    tab === "daily"
      ? [today, today]
      : tab === "weekly"
        ? weekBounds(today)
        : tab === "monthly"
          ? monthBounds(today)
          : yearBounds(today);
  return task.dueDate >= start && task.dueDate <= end;
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
  const [tab, setTab] = useState<Tab>("daily");

  const [optimistic, toggleLocally] = useOptimistic(
    tasks,
    (state: TaskWithCompletions[], id: number) =>
      state.map((t) => {
        if (t.id !== id) return t;
        if (t.recurrence === "one_off") {
          return { ...t, completedAt: t.completedAt ? null : new Date().toISOString() };
        }
        return {
          ...t,
          completedDates: t.completedDates.includes(today)
            ? t.completedDates.filter((d) => d !== today)
            : [...t.completedDates, today],
        };
      }),
  );

  const visible = useMemo(() => {
    const rows = optimistic
      .filter((t) => inTab(t, tab, today))
      .map((task) => ({ task, status: summarize(task, today) }));
    // Overdue first, then still-due, then done — the ones needing action rise up.
    return rows.sort((a, b) => {
      const rank = (s: TaskStatus) => (s.overdue ? 0 : s.done ? 2 : 1);
      return rank(a.status) - rank(b.status) || a.task.dueDate.localeCompare(b.task.dueDate);
    });
  }, [optimistic, tab, today]);

  function toggle(task: TaskWithCompletions) {
    startTransition(async () => {
      toggleLocally(task.id);
      await toggleTask(task.id, task.recurrence);
    });
  }

  return (
    <>
      <QuickAddBar />

      <SectionHeader
        title="Tasks"
        right={<span className="font-mono text-xs">{visible.length} in view</span>}
        className="mt-6"
      />

      <SegmentedControl
        testId="task-tabs"
        ariaLabel="Task view"
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        options={TABS.map((t) => ({ value: t, label: TAB_LABEL[t] }))}
        className="mb-4"
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={<IconAdd />}
          title={`Nothing on ${TAB_LABEL[tab]}`}
          hint="Add a task above, or switch tabs."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map(({ task, status }) => (
            <TaskRow key={task.id} task={task} status={status} onToggle={() => toggle(task)} />
          ))}
        </ul>
      )}

      <AddTaskForm categories={categories} today={today} className="mt-6" />
    </>
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

  return (
    <li>
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
            aria-pressed={status.done}
            aria-label={status.done ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
            onClick={onToggle}
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
              status.done
                ? "scale-100 border-done bg-done text-canvas shadow-[0_0_12px_-1px_rgba(84,203,126,0.65)]"
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
