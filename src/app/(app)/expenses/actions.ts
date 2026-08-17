"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  accounts,
  categoryBudgets,
  emis,
  expenseCategories,
  goalContributions,
  recurringBills,
  savingsGoals,
  transactions,
} from "@/db/schema";
import { today } from "@/lib/date";
import { advanceDueDate } from "@/lib/bill-schedule";
import { getAccountBalance } from "./queries";

const ADJUSTMENT_CATEGORY_NAME = "Balance Adjustment";
const EMI_CATEGORY_NAME = "EMI Payment";

export type FormState = { error?: string; ok?: boolean };

const ACCOUNT_TYPES = ["cash", "bank", "card", "other"] as const;
const TXN_TYPES = ["income", "expense"] as const;
const BILL_RECURRENCES = ["monthly", "yearly"] as const;

function revalidateAll() {
  revalidatePath("/expenses");
  revalidatePath("/"); // Today's quick-view widget.
}

/* -------------------------------------------------------------------------
 * Accounts
 * ---------------------------------------------------------------------- */

export async function addAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };

  const rawType = String(formData.get("type") ?? "cash");
  const type = ACCOUNT_TYPES.includes(rawType as (typeof ACCOUNT_TYPES)[number])
    ? (rawType as (typeof ACCOUNT_TYPES)[number])
    : "cash";

  await db.insert(accounts).values({ name, type });
  revalidateAll();
  return { ok: true };
}

export async function updateAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!Number.isFinite(id)) return { error: "Missing account" };
  if (!name) return { error: "Name is required" };

  const rawType = String(formData.get("type") ?? "cash");
  const type = ACCOUNT_TYPES.includes(rawType as (typeof ACCOUNT_TYPES)[number])
    ? (rawType as (typeof ACCOUNT_TYPES)[number])
    : "cash";

  await db.update(accounts).set({ name, type }).where(eq(accounts.id, id));
  revalidateAll();
  return { ok: true };
}

/**
 * `expense_categories` is unique on `(name, type)`, so a system category like
 * "Balance Adjustment" or "EMI Payment" needs one row per transaction type —
 * created lazily on first use rather than seeded, same "insert, fall back to
 * a lookup on conflict" shape as `addCategory`'s own unique-violation
 * handling. Shared by every caller that needs a category it can't ask the
 * user to pick (balance adjustments, EMI payments), rather than duplicating
 * this lookup-or-insert dance per caller.
 */
async function getOrCreateCategory(name: string, type: (typeof TXN_TYPES)[number]): Promise<number> {
  const [existing] = await db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(and(eq(expenseCategories.name, name), eq(expenseCategories.type, type)));
  if (existing) return existing.id;

  const [created] = await db
    .insert(expenseCategories)
    .values({ name, type })
    .onConflictDoNothing()
    .returning({ id: expenseCategories.id });
  if (created) return created.id;

  // Lost a race with a concurrent insert — the row now exists, look it up.
  const [row] = await db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(and(eq(expenseCategories.name, name), eq(expenseCategories.type, type)));
  return row.id;
}

/**
 * The manual "edit balance" action. Never writes a balance directly — it
 * recomputes the account's LIVE balance server-side (never trusts a
 * client-submitted "current balance", which could be stale), diffs it
 * against the requested new balance, and inserts exactly one transaction for
 * the difference. The balance itself stays fully derived, same invariant as
 * every other balance in this file.
 */
export async function adjustAccountBalance(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { error: "Missing account" };

  const raw = String(formData.get("balance") ?? "").trim();
  const target = Number(raw);
  if (!raw || !Number.isFinite(target)) return { error: "Balance must be a number" };

  const current = await getAccountBalance(id);
  const delta = Math.round((target - current) * 100) / 100;
  if (delta === 0) return { ok: true };

  const type: (typeof TXN_TYPES)[number] = delta > 0 ? "income" : "expense";
  const categoryId = await getOrCreateCategory(ADJUSTMENT_CATEGORY_NAME, type);

  await db.insert(transactions).values({
    type,
    amount: Math.abs(delta),
    categoryId,
    accountId: id,
    date: today(),
    note: "Manual balance adjustment",
  });

  revalidateAll();
  return { ok: true };
}

/**
 * Blocked (with a readable reason) rather than left to a raw FK-violation
 * error — `transactions.account_id` is `ON DELETE RESTRICT` deliberately, so
 * deleting an account can never silently orphan or cascade-delete financial
 * history.
 */
export async function deleteAccount(id: number): Promise<FormState> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(eq(transactions.accountId, id));

  if (count > 0) {
    return { error: `Can't delete — ${count} transaction${count === 1 ? "" : "s"} still use this account.` };
  }

  await db.delete(accounts).where(eq(accounts.id, id));
  revalidateAll();
  return { ok: true };
}

/* -------------------------------------------------------------------------
 * Categories
 * ---------------------------------------------------------------------- */

export async function addCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };

  const rawType = String(formData.get("type") ?? "expense");
  if (!TXN_TYPES.includes(rawType as (typeof TXN_TYPES)[number])) {
    return { error: "Pick income or expense" };
  }
  const type = rawType as (typeof TXN_TYPES)[number];

  try {
    await db.insert(expenseCategories).values({ name, type });
  } catch (err) {
    // Unique (name, type) — a friendlier message than the raw constraint error.
    if (err instanceof Error && "code" in err && err.code === "23505") {
      return { error: `"${name}" already exists as a${type === "income" ? "n" : ""} ${type} category` };
    }
    throw err;
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteCategory(id: number): Promise<FormState> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(eq(transactions.categoryId, id));

  if (count > 0) {
    return { error: `Can't delete — ${count} transaction${count === 1 ? "" : "s"} still use this category.` };
  }

  await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
  revalidateAll();
  return { ok: true };
}

/* -------------------------------------------------------------------------
 * Transactions
 * ---------------------------------------------------------------------- */

function parseAmount(formData: FormData): { value?: number; error?: string } {
  const raw = String(formData.get("amount") ?? "").trim();
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n <= 0) return { error: "Amount must be a positive number" };
  return { value: Math.round(n * 100) / 100 };
}

export async function addTransaction(_prev: FormState, formData: FormData): Promise<FormState> {
  const rawType = String(formData.get("type") ?? "expense");
  if (!TXN_TYPES.includes(rawType as (typeof TXN_TYPES)[number])) {
    return { error: "Pick income or expense" };
  }
  const type = rawType as (typeof TXN_TYPES)[number];

  const amount = parseAmount(formData);
  if (amount.error) return { error: amount.error };

  const categoryId = Number(formData.get("categoryId"));
  const accountId = Number(formData.get("accountId"));
  if (!Number.isFinite(categoryId)) return { error: "Pick a category" };
  if (!Number.isFinite(accountId)) return { error: "Pick an account" };

  const date = String(formData.get("date") ?? "").trim() || today();
  const note = String(formData.get("note") ?? "").trim();

  await db.insert(transactions).values({
    type,
    amount: amount.value!,
    categoryId,
    accountId,
    date,
    note: note || null,
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteTransaction(id: number) {
  await db.delete(transactions).where(eq(transactions.id, id));
  revalidateAll();
}

/* -------------------------------------------------------------------------
 * Recurring bills — separate from the transaction ledger by design.
 *
 * A due date passing does NOT create a transaction on its own. Only
 * `markBillPaid` does, and it does so explicitly: one real transaction, plus
 * the bill's `dueDate` advanced to the next occurrence, in the same action.
 * ---------------------------------------------------------------------- */

export async function addBill(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };

  const amount = parseAmount(formData);
  if (amount.error) return { error: amount.error };

  const categoryId = Number(formData.get("categoryId"));
  const accountId = Number(formData.get("accountId"));
  if (!Number.isFinite(categoryId)) return { error: "Pick a category" };
  if (!Number.isFinite(accountId)) return { error: "Pick an account" };

  const rawRecurrence = String(formData.get("recurrence") ?? "monthly");
  if (!BILL_RECURRENCES.includes(rawRecurrence as (typeof BILL_RECURRENCES)[number])) {
    return { error: "Pick monthly or yearly" };
  }
  const recurrence = rawRecurrence as (typeof BILL_RECURRENCES)[number];

  const dueDate = String(formData.get("dueDate") ?? "").trim();
  if (!dueDate) return { error: "Next due date is required" };

  await db.insert(recurringBills).values({
    name,
    amount: amount.value!,
    categoryId,
    accountId,
    recurrence,
    dueDate,
  });

  revalidateAll();
  return { ok: true };
}

export async function toggleBillActive(id: number, active: boolean) {
  await db.update(recurringBills).set({ active }).where(eq(recurringBills.id, id));
  revalidateAll();
}

export async function deleteBill(id: number) {
  await db.delete(recurringBills).where(eq(recurringBills.id, id));
  revalidateAll();
}

/** The one action that turns a bill into money: a real transaction, and the next due date. */
export async function markBillPaid(id: number): Promise<FormState> {
  const [bill] = await db.select().from(recurringBills).where(eq(recurringBills.id, id));
  if (!bill) return { error: "Bill not found" };

  await db.insert(transactions).values({
    type: "expense",
    amount: bill.amount,
    categoryId: bill.categoryId,
    accountId: bill.accountId,
    date: today(),
    note: `Bill: ${bill.name}`,
  });

  await db
    .update(recurringBills)
    .set({ dueDate: advanceDueDate(bill.dueDate, bill.recurrence) })
    .where(eq(recurringBills.id, id));

  revalidateAll();
  return { ok: true };
}

/* -------------------------------------------------------------------------
 * EMIs / loans — separate from the transaction ledger, same reasoning as
 * recurring bills, but `markEmiPaid` also advances `installmentsPaid` and
 * auto-closes the loan once the tenure is fully paid off.
 * ---------------------------------------------------------------------- */

function parsePositiveInt(formData: FormData, field: string, label: string): { value?: number; error?: string } {
  const raw = String(formData.get(field) ?? "").trim();
  const n = Number(raw);
  if (!raw || !Number.isInteger(n) || n <= 0) return { error: `${label} must be a whole number greater than 0` };
  return { value: n };
}

export async function addEmi(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };

  const principal = parseAmount(formData); // reads "amount" — the form's principal field
  if (principal.error) return { error: principal.error };

  const emiAmountRaw = String(formData.get("emiAmount") ?? "").trim();
  const emiAmountNum = Number(emiAmountRaw);
  if (!emiAmountRaw || !Number.isFinite(emiAmountNum) || emiAmountNum <= 0) {
    return { error: "EMI amount must be a positive number" };
  }
  const emiAmount = Math.round(emiAmountNum * 100) / 100;

  const tenure = parsePositiveInt(formData, "tenureMonths", "Tenure");
  if (tenure.error) return { error: tenure.error };

  const rawPaid = String(formData.get("installmentsPaid") ?? "0").trim();
  const installmentsPaid = rawPaid === "" ? 0 : Number(rawPaid);
  if (!Number.isInteger(installmentsPaid) || installmentsPaid < 0) {
    return { error: "Installments paid must be a whole number, 0 or more" };
  }
  if (installmentsPaid > tenure.value!) {
    return { error: "Installments paid can't exceed the tenure" };
  }

  const accountId = Number(formData.get("accountId"));
  if (!Number.isFinite(accountId)) return { error: "Pick an account" };

  const dueDate = String(formData.get("dueDate") ?? "").trim();
  if (!dueDate) return { error: "Next due date is required" };

  await db.insert(emis).values({
    name,
    principalAmount: principal.value!,
    emiAmount,
    tenureMonths: tenure.value!,
    installmentsPaid,
    accountId,
    dueDate,
    active: installmentsPaid < tenure.value!,
  });

  revalidateAll();
  return { ok: true };
}

export async function toggleEmiActive(id: number, active: boolean) {
  await db.update(emis).set({ active }).where(eq(emis.id, id));
  revalidateAll();
}

export async function deleteEmi(id: number) {
  await db.delete(emis).where(eq(emis.id, id));
  revalidateAll();
}

/** The one action that turns an EMI into money: a real transaction, the next due date, and one more installment paid. */
export async function markEmiPaid(id: number): Promise<FormState> {
  const [emi] = await db.select().from(emis).where(eq(emis.id, id));
  if (!emi) return { error: "EMI not found" };
  if (emi.installmentsPaid >= emi.tenureMonths) return { error: "All installments are already paid" };

  const categoryId = await getOrCreateCategory(EMI_CATEGORY_NAME, "expense");

  await db.insert(transactions).values({
    type: "expense",
    amount: emi.emiAmount,
    categoryId,
    accountId: emi.accountId,
    date: today(),
    note: `EMI: ${emi.name}`,
  });

  const installmentsPaid = emi.installmentsPaid + 1;
  await db
    .update(emis)
    .set({
      installmentsPaid,
      dueDate: advanceDueDate(emi.dueDate, "monthly"),
      // Fully paid off -> auto-close, same as a bill you'd otherwise deactivate by hand.
      active: installmentsPaid < emi.tenureMonths,
    })
    .where(eq(emis.id, id));

  revalidateAll();
  return { ok: true };
}

/* -------------------------------------------------------------------------
 * Savings goals — contributions are their own ledger, never inserted into
 * `transactions` (see schema.ts for why: the money is already in the linked
 * account, so a contribution only re-labels existing balance as earmarked,
 * it doesn't create new income or expense).
 * ---------------------------------------------------------------------- */

export async function addSavingsGoal(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };

  const target = parseAmount(formData); // reads "amount"
  if (target.error) return { error: target.error };

  const accountId = Number(formData.get("accountId"));
  if (!Number.isFinite(accountId)) return { error: "Pick an account" };

  const targetDate = String(formData.get("targetDate") ?? "").trim();

  await db.insert(savingsGoals).values({
    name,
    targetAmount: target.value!,
    targetDate: targetDate || null,
    accountId,
  });

  revalidateAll();
  return { ok: true };
}

export async function toggleSavingsGoalActive(id: number, active: boolean) {
  await db.update(savingsGoals).set({ active }).where(eq(savingsGoals.id, id));
  revalidateAll();
}

export async function deleteSavingsGoal(id: number) {
  await db.delete(savingsGoals).where(eq(savingsGoals.id, id)); // cascades its contributions
  revalidateAll();
}

export async function addContribution(_prev: FormState, formData: FormData): Promise<FormState> {
  const savingsGoalId = Number(formData.get("savingsGoalId"));
  if (!Number.isFinite(savingsGoalId)) return { error: "Missing goal" };

  const amount = parseAmount(formData);
  if (amount.error) return { error: amount.error };

  const date = String(formData.get("date") ?? "").trim() || today();
  const note = String(formData.get("note") ?? "").trim();

  await db.insert(goalContributions).values({
    savingsGoalId,
    amount: amount.value!,
    date,
    note: note || null,
  });

  revalidateAll();
  return { ok: true };
}

export async function deleteContribution(id: number) {
  await db.delete(goalContributions).where(eq(goalContributions.id, id));
  revalidateAll();
}

/* -------------------------------------------------------------------------
 * Category budgets
 * ---------------------------------------------------------------------- */

export async function setCategoryBudget(_prev: FormState, formData: FormData): Promise<FormState> {
  const categoryId = Number(formData.get("categoryId"));
  if (!Number.isFinite(categoryId)) return { error: "Pick a category" };

  const raw = String(formData.get("monthlyAmount") ?? "").trim();
  const n = Number(raw);
  if (!raw || !Number.isFinite(n) || n <= 0) return { error: "Budget must be a positive number" };
  const monthlyAmount = Math.round(n * 100) / 100;

  await db
    .insert(categoryBudgets)
    .values({ categoryId, monthlyAmount })
    .onConflictDoUpdate({ target: categoryBudgets.categoryId, set: { monthlyAmount } });

  revalidateAll();
  return { ok: true };
}

export async function deleteCategoryBudget(categoryId: number) {
  await db.delete(categoryBudgets).where(eq(categoryBudgets.categoryId, categoryId));
  revalidateAll();
}
