"use client";

import { startTransition, useActionState, useState } from "react";
import { IconAdd } from "@/components/icons";
import { Badge, Button, Card, Disclosure, EmptyState, Input, TextButton } from "@/components/ui";
import { HABIT_COLOR_BG, type HabitColor } from "@/lib/habit-color";
import { addHabit, deleteHabit, setHabitActive, updateHabit, type FormState } from "./actions";
import DayPicker, { formatScheduledDays, WeekdayDots } from "./DayPicker";
import HabitColorPicker from "./HabitColorPicker";

export type ManagedHabit = {
  id: number;
  name: string;
  scheduledDays: number[];
  color: HabitColor;
  active: boolean;
};

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Ported from the web app's `HabitManager.tsx`. `onChanged` replaces
 * `revalidatePath` — every mutation here writes straight to the on-device
 * DB, then the parent screen re-fetches its list so this stays a thin view
 * over data it doesn't own.
 */
export default function HabitManager({
  habits,
  onChanged,
}: {
  habits: ManagedHabit[];
  onChanged: () => void;
}) {
  const active = habits.filter((h) => h.active);
  const archived = habits.filter((h) => !h.active);

  return (
    <div className="space-y-4">
      <AddHabitForm onChanged={onChanged} />

      {active.length === 0 && archived.length === 0 && (
        <EmptyState icon={<IconAdd />} title="No habits yet" hint="Add your first one above." />
      )}

      {active.length > 0 && (
        <div className="grid gap-2 lg:grid-cols-2">
          {active.map((h) => (
            <HabitRow key={h.id} habit={h} onChanged={onChanged} />
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <Disclosure label={`Archived (${archived.length})`}>
          <div className="grid gap-2 lg:grid-cols-2">
            {archived.map((h) => (
              <HabitRow key={h.id} habit={h} onChanged={onChanged} />
            ))}
          </div>
        </Disclosure>
      )}
    </div>
  );
}

function HabitRow({ habit, onChanged }: { habit: ManagedHabit; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await updateHabit(prev, formData);
    if (result.ok) {
      setEditing(false);
      onChanged();
    }
    return result;
  }, {});

  return (
    <Card className="h-full p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${HABIT_COLOR_BG[habit.color]}`} />
            <span className="truncate">{habit.name}</span>
          </p>
          <p className="mt-0.5 font-mono text-2xs text-faint">{formatScheduledDays(habit.scheduledDays)}</p>
          <WeekdayDots scheduledDays={habit.scheduledDays} color={habit.color} className="mt-1.5" />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {!habit.active && <Badge tone="idle">archived</Badge>}
          <TextButton onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit"}</TextButton>
          <TextButton
            onClick={() =>
              startTransition(async () => {
                await setHabitActive(habit.id, !habit.active);
                onChanged();
              })
            }
          >
            {habit.active ? "Archive" : "Restore"}
          </TextButton>
          <TextButton
            className="text-warn hover:text-warn"
            onClick={() => {
              if (
                !window.confirm(`Delete “${habit.name}” and its check-off history? This cannot be undone.`)
              ) {
                return;
              }

              startTransition(async () => {
                await deleteHabit(habit.id);
                onChanged();
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
          <HabitColorPicker defaultValue={habit.color} ariaLabel={`Color for ${habit.name}`} />
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

function AddHabitForm({ onChanged }: { onChanged: () => void }) {
  const [state, action] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await addHabit(prev, formData);
    if (result.ok) onChanged();
    return result;
  }, {});

  return (
    <Disclosure label="+ Add habit">
      <form action={action} className="max-w-xl space-y-2">
        <Input name="name" required placeholder="e.g. Read 20 pages" aria-label="Habit name" />
        <DayPicker defaultValue={ALL_DAYS} />
        <p className="text-2xs text-faint">
          All seven days selected is a daily habit — untick any day to make it a fixed weekly
          schedule instead.
        </p>
        <HabitColorPicker />
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
