"use client";

import { startTransition, useActionState, useState } from "react";
import { Badge, Button, Card, Disclosure, EmptyState, Input, TextButton } from "@/components/ui";
import { IconAdd } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { addHabit, deleteHabit, setHabitActive, updateHabit, type FormState } from "./actions";
import DayPicker, { WeekdayDots, formatScheduledDays } from "./DayPicker";
import ColorPicker from "./HabitColor";
import { HABIT_COLOR_BG, type HabitColor } from "./habit-color";

export type ManagedHabit = {
  id: number;
  name: string;
  scheduledDays: number[];
  color: HabitColor;
  active: boolean;
};

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

export default function HabitManager({ habits }: { habits: ManagedHabit[] }) {
  const active = habits.filter((h) => h.active);
  const archived = habits.filter((h) => !h.active);

  return (
    <div className="space-y-4">
      <AddHabitForm />

      {active.length === 0 && archived.length === 0 && (
        <EmptyState icon={<IconAdd />} title="No habits yet" hint="Add your first one above." />
      )}

      {active.length > 0 && (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {active.map((h) => (
            <HabitRow key={h.id} habit={h} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        /* The label text is matched verbatim by the e2e suite — keep the count
           in parentheses and nothing else inside the summary. */
        <Disclosure label={`Archived (${archived.length})`}>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {archived.map((h) => (
              <HabitRow key={h.id} habit={h} />
            ))}
          </div>
        </Disclosure>
      )}
    </div>
  );
}

function HabitRow({ habit }: { habit: ManagedHabit }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(updateHabit, {});
  const toast = useToast();

  return (
    <Card
      className="h-full p-3.5"
      data-testid="managed-habit"
      data-name={habit.name}
      data-scheduled-days={habit.scheduledDays.join(",")}
      data-color={habit.color}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            <span
              aria-hidden
              className={`h-2 w-2 shrink-0 rounded-full ${HABIT_COLOR_BG[habit.color]}`}
            />
            <span className="truncate">{habit.name}</span>
          </p>
          <p className="mt-0.5 font-mono text-2xs text-faint">
            {formatScheduledDays(habit.scheduledDays)}
          </p>
          <WeekdayDots scheduledDays={habit.scheduledDays} color={habit.color} className="mt-1.5" />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {!habit.active && <Badge tone="idle">archived</Badge>}
          <TextButton onClick={() => setEditing((v) => !v)}>
            {editing ? "Close" : "Edit"}
          </TextButton>
          <TextButton
            data-testid={habit.active ? "archive-habit" : "unarchive-habit"}
            onClick={() =>
              startTransition(async () => {
                await setHabitActive(habit.id, !habit.active);
                toast(
                  habit.active ? "Habit archived" : "Habit restored",
                  habit.active ? "neutral" : "done",
                );
              })
            }
          >
            {habit.active ? "Archive" : "Restore"}
          </TextButton>
          <TextButton
            data-testid="delete-habit"
            className="text-warn hover:text-warn"
            onClick={() => {
              if (!window.confirm(`Delete “${habit.name}” and its check-off history? This cannot be undone.`)) {
                return;
              }

              startTransition(async () => {
                await deleteHabit(habit.id);
                toast("Habit deleted", "neutral");
              });
            }}
          >
            Delete
          </TextButton>
        </div>
      </div>

      {editing && (
        <form action={action} className="mt-3 space-y-3 border-t border-line pt-3">
          <input type="hidden" name="id" value={habit.id} />
          <Input name="name" defaultValue={habit.name} required aria-label="Name" />
          <DayPicker defaultValue={habit.scheduledDays} ariaLabel={`Scheduled days for ${habit.name}`} />
          <ColorPicker defaultValue={habit.color} ariaLabel={`Color for ${habit.name}`} />
          <Button type="submit" variant="primary" className="shrink-0">
            Save
          </Button>
          {state.error && (
            <p role="alert" className="text-xs text-warn">
              {state.error}
            </p>
          )}
        </form>
      )}
    </Card>
  );
}

function AddHabitForm() {
  const [state, action] = useActionState<FormState, FormData>(addHabit, {});

  return (
    <Disclosure label="+ Add habit">
      <form
        action={action}
        data-testid="add-habit-form"
        className="max-w-xl space-y-2"
      >
        <Input
          name="name"
          required
          placeholder="e.g. Read 20 pages"
          aria-label="Habit name"
        />
        <DayPicker defaultValue={ALL_DAYS} />
        <p className="text-2xs text-faint">
          All seven days selected is a daily habit — untick any day to make it a
          fixed weekly schedule instead.
        </p>
        <ColorPicker />
        <Button type="submit" variant="primary" size="lg">
          Add habit
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
