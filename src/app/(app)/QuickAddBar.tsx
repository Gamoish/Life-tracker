"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import Modal from "@/components/Modal";
import {
  IconAdd,
  IconDroplet,
  IconFlame,
  IconJournal,
  IconMoon,
  IconRepeat,
  IconScale,
  IconWallet,
} from "@/components/icons";
import { useToast } from "@/components/Toast";
import { toDisplay, type WeightUnit } from "@/lib/weight-unit";
import { HABIT_COLOR_BG, type HabitColor } from "./habits/habit-color";
import { addFood, logWaterBottle, logWaterCustom, logWeight, saveSleep } from "./health/actions";
import { quickAddTask } from "./tasks/actions";
import { addTransaction } from "./expenses/actions";
import { saveTodayEntry } from "./journal/actions";
import { toggleHabit } from "./habits/actions";

type ActionState = { error?: string; ok?: boolean };

export type QuickAddAccount = { id: number; name: string };
export type QuickAddCategory = { id: number; name: string; type: "income" | "expense" };
export type QuickAddHabit = { id: number; name: string; color: HabitColor };

/**
 * Today's quick-add bar — a grid of capture actions, each opening the shared
 * `Modal` with a small form wired to the SAME server action its own page uses
 * (water/food/weight/sleep from Health, a one-off task, an expense, a journal
 * entry, a habit check-off). Nothing here re-implements a mutation; it only
 * offers a faster door into the existing ones, so a log written from Home is
 * indistinguishable from one written on the module's own page.
 */
export default function QuickAddBar({
  bottleSizeMl,
  weightUnit,
  todayWeightKg,
  accounts,
  categories,
  dueHabits,
}: {
  bottleSizeMl: number;
  weightUnit: WeightUnit;
  todayWeightKg: number | null;
  accounts: QuickAddAccount[];
  categories: QuickAddCategory[];
  dueHabits: QuickAddHabit[];
}) {
  const [open, setOpen] = useState<ActionKey | null>(null);
  const close = () => setOpen(null);

  const actions = ACTIONS.filter((a) => a.key !== "habit" || dueHabits.length > 0);

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {actions.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setOpen(key)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-card border border-line bg-gradient-to-b from-raised/60 to-surface px-1 py-3 text-2xs font-semibold text-muted transition-[border-color,color,transform] duration-150 hover:border-accent/40 hover:text-ink active:scale-95 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-accent"
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <Modal open={open !== null} onClose={close} title={open ? TITLES[open] : ""} icon={open ? ICONS[open] : undefined}>
        {open === "water" && <WaterForm bottleSizeMl={bottleSizeMl} onDone={close} />}
        {open === "food" && <FoodForm onDone={close} />}
        {open === "task" && <TaskForm onDone={close} />}
        {open === "weight" && (
          <WeightForm weightUnit={weightUnit} todayWeightKg={todayWeightKg} onDone={close} />
        )}
        {open === "sleep" && <SleepForm onDone={close} />}
        {open === "expense" && (
          <ExpenseForm accounts={accounts} categories={categories} onDone={close} />
        )}
        {open === "journal" && <JournalForm onDone={close} />}
        {open === "habit" && <HabitPicker habits={dueHabits} onDone={close} />}
      </Modal>
    </>
  );
}

type ActionKey =
  | "water"
  | "food"
  | "task"
  | "weight"
  | "sleep"
  | "expense"
  | "journal"
  | "habit";

const ACTIONS: { key: ActionKey; label: string; icon: ReactNode }[] = [
  { key: "water", label: "Water", icon: <IconDroplet filled /> },
  { key: "food", label: "Food", icon: <IconFlame /> },
  { key: "task", label: "Task", icon: <IconAdd className="h-5 w-5" /> },
  { key: "weight", label: "Weight", icon: <IconScale /> },
  { key: "sleep", label: "Sleep", icon: <IconMoon /> },
  { key: "expense", label: "Expense", icon: <IconWallet /> },
  { key: "journal", label: "Journal", icon: <IconJournal /> },
  { key: "habit", label: "Habit", icon: <IconRepeat /> },
];

const TITLES: Record<ActionKey, string> = {
  water: "Log water",
  food: "Log food",
  task: "Add task",
  weight: "Log weight",
  sleep: "Log sleep",
  expense: "Add expense",
  journal: "Journal entry",
  habit: "Check off a habit",
};

const ICONS: Record<ActionKey, ReactNode> = Object.fromEntries(
  ACTIONS.map((a) => [a.key, a.icon]),
) as Record<ActionKey, ReactNode>;

/** Closes the sheet (and toasts) the moment a server action reports success. */
function useCloseOnSuccess(state: ActionState, onSuccess: () => void) {
  useEffect(() => {
    if (state.ok) onSuccess();
    // Re-runs once per resolved submission — `onSuccess` is a fresh closure
    // each render, so it is intentionally excluded from the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

function FormError({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="mt-2 text-xs text-warn">
      {state.error}
    </p>
  );
}

function WaterForm({ bottleSizeMl, onDone }: { bottleSizeMl: number; onDone: () => void }) {
  const toast = useToast();
  const [state, action] = useActionState<ActionState, FormData>(logWaterCustom, {});
  useCloseOnSuccess(state, () => {
    toast("Water logged", "accent");
    onDone();
  });

  return (
    <div className="space-y-3">
      <Button
        variant="primary"
        size="lg"
        onClick={() =>
          startTransition(async () => {
            await logWaterBottle(bottleSizeMl);
            toast(`Logged a bottle · ${bottleSizeMl}ml`, "accent");
            onDone();
          })
        }
      >
        <IconDroplet filled className="h-4 w-4" />
        Log a bottle ({bottleSizeMl}ml)
      </Button>
      <form action={action} className="flex items-end gap-2">
        <Field label="Custom amount (ml)" className="min-w-0 flex-1">
          <Input name="amountMl" type="number" min={1} placeholder="e.g. 300" aria-label="Custom water amount in ml" />
        </Field>
        <Button type="submit" className="shrink-0">
          Log
        </Button>
      </form>
      <FormError state={state} />
    </div>
  );
}

function FoodForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [state, action] = useActionState<ActionState, FormData>(addFood, {});
  useCloseOnSuccess(state, () => {
    toast("Food logged", "accent");
    onDone();
  });

  return (
    <form action={action} className="space-y-3">
      <Field label="Item">
        <Input name="item" required placeholder="e.g. Chicken salad" aria-label="Food item" />
      </Field>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Field label="Meal (optional)">
            <Select name="meal" aria-label="Meal" defaultValue="">
              <option value="">—</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </Select>
          </Field>
        </div>
        <div className="w-24 shrink-0">
          <Field label="Calories">
            <Input name="calories" type="number" min={0} placeholder="cal" aria-label="Calories" />
          </Field>
        </div>
      </div>
      <Button type="submit" variant="primary" size="lg">
        Log food
      </Button>
      <FormError state={state} />
    </form>
  );
}

function TaskForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [state, action] = useActionState<ActionState, FormData>(quickAddTask, {});
  useCloseOnSuccess(state, () => {
    toast("Task added for today", "accent");
    onDone();
  });

  return (
    <form action={action} className="space-y-3">
      <Field label="Task" hint="Added as a one-off due today — set a schedule from the Tasks page.">
        <Input name="title" required placeholder="e.g. Call the dentist" aria-label="Task title" />
      </Field>
      <Button type="submit" variant="primary" size="lg">
        Add task
      </Button>
      <FormError state={state} />
    </form>
  );
}

function WeightForm({
  weightUnit,
  todayWeightKg,
  onDone,
}: {
  weightUnit: WeightUnit;
  todayWeightKg: number | null;
  onDone: () => void;
}) {
  const toast = useToast();
  const [state, action] = useActionState<ActionState, FormData>(logWeight, {});
  useCloseOnSuccess(state, () => {
    toast("Weight logged", "accent");
    onDone();
  });

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="unit" value={weightUnit} />
      <Field label={`Weight (${weightUnit})`}>
        <Input
          name="weight"
          type="number"
          min={0}
          step="0.1"
          defaultValue={todayWeightKg !== null ? toDisplay(todayWeightKg, weightUnit).toFixed(1) : ""}
          placeholder={weightUnit === "lbs" ? "e.g. 157.5" : "e.g. 71.4"}
          aria-label={`Weight in ${weightUnit}`}
        />
      </Field>
      <Button type="submit" variant="primary" size="lg">
        Log weight
      </Button>
      <FormError state={state} />
    </form>
  );
}

function SleepForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [state, action] = useActionState<ActionState, FormData>(saveSleep, {});
  useCloseOnSuccess(state, () => {
    toast("Sleep logged", "accent");
    onDone();
  });

  return (
    <form action={action} className="space-y-3">
      <div className="flex gap-2">
        <Field label="Bed time" className="min-w-0 flex-1">
          <Input name="bedTime" type="time" required defaultValue="23:00" aria-label="Bed time" />
        </Field>
        <Field label="Wake time" className="min-w-0 flex-1">
          <Input name="wakeTime" type="time" required defaultValue="07:00" aria-label="Wake time" />
        </Field>
      </div>
      <Button type="submit" variant="primary" size="lg">
        Log sleep
      </Button>
      <FormError state={state} />
    </form>
  );
}

function ExpenseForm({
  accounts,
  categories,
  onDone,
}: {
  accounts: QuickAddAccount[];
  categories: QuickAddCategory[];
  onDone: () => void;
}) {
  const toast = useToast();
  const [state, action] = useActionState<ActionState, FormData>(addTransaction, {});
  useCloseOnSuccess(state, () => {
    toast("Expense added", "accent");
    onDone();
  });

  const expenseCategories = categories.filter((c) => c.type === "expense");

  if (accounts.length === 0 || expenseCategories.length === 0) {
    return (
      <p className="text-sm text-muted">
        Add an account and an expense category on the{" "}
        <a href="/expenses" className="text-accent underline underline-offset-4">
          Expenses page
        </a>{" "}
        first, then you can log spending from here.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="type" value="expense" />
      <Field label="Amount">
        <Input name="amount" type="number" min={0} step="0.01" required placeholder="0.00" aria-label="Amount" />
      </Field>
      <div className="flex gap-2">
        <Field label="Category" className="min-w-0 flex-1">
          <Select name="categoryId" aria-label="Category" defaultValue="">
            <option value="" disabled>
              Pick one
            </option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Account" className="min-w-0 flex-1">
          <Select name="accountId" aria-label="Account" defaultValue="">
            <option value="" disabled>
              Pick one
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Note (optional)">
        <Input name="note" placeholder="e.g. Groceries" aria-label="Note" />
      </Field>
      <Button type="submit" variant="primary" size="lg">
        Add expense
      </Button>
      <FormError state={state} />
    </form>
  );
}

function JournalForm({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [state, action] = useActionState<ActionState, FormData>(saveTodayEntry, {});
  useCloseOnSuccess(state, () => {
    toast("Journal saved", "accent");
    onDone();
  });

  return (
    <form action={action} className="space-y-3">
      <Field label="Today's entry">
        <Textarea name="text" rows={5} placeholder="What happened, what you're grateful for, what's on your mind." aria-label="Journal entry" />
      </Field>
      <Button type="submit" variant="primary" size="lg">
        Save entry
      </Button>
      <FormError state={state} />
    </form>
  );
}

/**
 * The habit picker — every habit still due (scheduled today, not yet checked).
 * Tapping one checks it off through the same `toggleHabit` action the check-off
 * list uses, then closes the sheet.
 */
function HabitPicker({ habits, onDone }: { habits: QuickAddHabit[]; onDone: () => void }) {
  const toast = useToast();

  if (habits.length === 0) {
    return <p className="text-sm text-muted">Every habit due today is already checked off. 🎉</p>;
  }

  return (
    <ul className="space-y-2">
      {habits.map((h) => (
        <li key={h.id}>
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                toast(`${h.name} · checked off`, "done");
                onDone();
                await toggleHabit(h.id);
              })
            }
            className="flex w-full items-center gap-2.5 rounded-card border border-line bg-surface px-4 py-3 text-left text-sm font-medium transition-colors hover:border-line-strong hover:bg-raised"
          >
            <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${HABIT_COLOR_BG[h.color]}`} />
            <span className="min-w-0 flex-1 truncate">{h.name}</span>
            <span className="shrink-0 text-2xs font-semibold uppercase tracking-wide text-accent">Check off</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
