import { daysInMonth } from "./date";

/**
 * Recurring bill due-date maths. Pure and DB-free, same spirit as
 * `task-schedule.ts` — but bills store their due date as a MUTABLE "next
 * occurrence" (advanced forward on payment), not an immutable anchor, so
 * this file is just the one function that advance needs, not a whole
 * due-on/overdue rule set.
 */

export type BillRecurrence = "monthly" | "yearly";

/**
 * The next occurrence after `dueDate`, one period forward. Day-of-month (or
 * month+day for yearly) is clamped to whatever the target month actually
 * has — a bill due the 31st becomes due the 28th/29th in February, and
 * stays clamped from then on rather than jumping back to 31 in a longer
 * month later. That's a known, accepted simplification for a personal
 * tracker, not an oversight.
 */
export function advanceDueDate(dueDate: string, recurrence: BillRecurrence): string {
  const [y, m, d] = dueDate.split("-").map(Number);

  if (recurrence === "monthly") {
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    const nd = Math.min(d, daysInMonth(ny, nm));
    return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
  }

  const ny = y + 1;
  const nd = Math.min(d, daysInMonth(ny, m));
  return `${ny}-${String(m).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}
