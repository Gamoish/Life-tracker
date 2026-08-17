/**
 * Merges recurring bills and EMIs into one date-sorted "upcoming" list for
 * the Today/Expense quick-view — a single widget, not two. Pure and DB-free,
 * same spirit as `bill-schedule.ts`.
 */

export type UpcomingBillInput = {
  id: number;
  name: string;
  amount: number;
  dueDate: string;
};

export type UpcomingEmiInput = {
  id: number;
  name: string;
  emiAmount: number;
  dueDate: string;
  installmentsPaid: number;
  tenureMonths: number;
};

export type UpcomingItem =
  | { kind: "bill"; id: number; name: string; amount: number; dueDate: string }
  | {
      kind: "emi";
      id: number;
      name: string;
      amount: number;
      dueDate: string;
      installmentsPaid: number;
      tenureMonths: number;
    };

/** Both inputs are already filtered to "active and due within the horizon" by the caller's query. */
export function mergeUpcoming(bills: UpcomingBillInput[], emis: UpcomingEmiInput[]): UpcomingItem[] {
  const items: UpcomingItem[] = [
    ...bills.map((b): UpcomingItem => ({ kind: "bill", id: b.id, name: b.name, amount: b.amount, dueDate: b.dueDate })),
    ...emis.map(
      (e): UpcomingItem => ({
        kind: "emi",
        id: e.id,
        name: e.name,
        amount: e.emiAmount,
        dueDate: e.dueDate,
        installmentsPaid: e.installmentsPaid,
        tenureMonths: e.tenureMonths,
      }),
    ),
  ];
  // ISO dates sort lexicographically; ties keep bills before EMIs (input order is stable).
  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
