import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
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

/**
 * The single DB path for the expense tracker.
 *
 * Account balances are deliberately never stored — same rule this app
 * already applies to goal/roadmap progress. Every balance here is a live
 * `sum(income) - sum(expense)` aggregate, so an edited or deleted
 * transaction can never leave a stored number out of sync with reality.
 */

export type AccountType = "cash" | "bank" | "card" | "other";
export type TransactionType = "income" | "expense";

export type AccountWithBalance = {
  id: number;
  name: string;
  type: AccountType;
  active: boolean;
  balance: number;
};

const balanceExpr = sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else -${transactions.amount} end), 0)`;

export async function listAccounts(): Promise<AccountWithBalance[]> {
  // A LEFT JOIN + GROUP BY, not a correlated subquery — both `accounts` and
  // `transactions` are genuinely part of this query's FROM/JOIN, which is
  // what keeps every column reference unambiguous. A hand-built subquery
  // with `${accounts.id}` interpolated into its WHERE clause looked right
  // but rendered UNQUALIFIED ("id" instead of "accounts"."id"), which inside
  // a `FROM transactions` subquery resolves to `transactions.id` instead —
  // silently comparing a transaction's own id to its account_id, never true.
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      active: accounts.active,
      balance: balanceExpr,
    })
    .from(accounts)
    .leftJoin(transactions, eq(transactions.accountId, accounts.id))
    .groupBy(accounts.id)
    .orderBy(asc(accounts.name));

  return rows.map((r) => ({ ...r, balance: Number(r.balance) }));
}

export async function getTotalBalance(): Promise<number> {
  const [row] = await db.select({ total: balanceExpr }).from(transactions);
  return Number(row?.total ?? 0);
}

/** Single-account version of `balanceExpr`, for computing an edit's delta server-side. */
export async function getAccountBalance(accountId: number): Promise<number> {
  const [row] = await db
    .select({ total: balanceExpr })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));
  return Number(row?.total ?? 0);
}

export type CategoryNode = {
  id: number;
  name: string;
  type: TransactionType;
};

export async function listCategories(): Promise<CategoryNode[]> {
  return db
    .select({ id: expenseCategories.id, name: expenseCategories.name, type: expenseCategories.type })
    .from(expenseCategories)
    .orderBy(asc(expenseCategories.type), asc(expenseCategories.name));
}

export type TransactionRow = {
  id: number;
  type: TransactionType;
  amount: number;
  date: string;
  note: string | null;
  accountId: number;
  accountName: string;
  categoryId: number;
  categoryName: string;
};

export type TransactionFilter = {
  accountId?: number;
  categoryId?: number;
  start?: string;
  end?: string;
};

export async function listTransactions(
  filter: TransactionFilter = {},
  limit = 200,
): Promise<TransactionRow[]> {
  const conditions = [
    filter.accountId ? eq(transactions.accountId, filter.accountId) : undefined,
    filter.categoryId ? eq(transactions.categoryId, filter.categoryId) : undefined,
    filter.start ? gte(transactions.date, filter.start) : undefined,
    filter.end ? lte(transactions.date, filter.end) : undefined,
  ].filter((c) => c !== undefined);

  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
      note: transactions.note,
      accountId: transactions.accountId,
      accountName: accounts.name,
      categoryId: transactions.categoryId,
      categoryName: expenseCategories.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(expenseCategories, eq(transactions.categoryId, expenseCategories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit);

  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

export type MonthSummary = { income: number; expense: number };

export async function getMonthSummary(start: string, end: string): Promise<MonthSummary> {
  const rows = await db
    .select({
      type: transactions.type,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(and(gte(transactions.date, start), lte(transactions.date, end)))
    .groupBy(transactions.type);

  const summary: MonthSummary = { income: 0, expense: 0 };
  for (const r of rows) summary[r.type] = Number(r.total);
  return summary;
}

/* -------------------------------------------------------------------------
 * Recurring bills — tracked separately from `transactions` (see schema.ts).
 * ---------------------------------------------------------------------- */

export type BillRecurrence = "monthly" | "yearly";

export type BillRow = {
  id: number;
  name: string;
  amount: number;
  categoryId: number;
  categoryName: string;
  accountId: number;
  accountName: string;
  recurrence: BillRecurrence;
  dueDate: string;
  active: boolean;
};

const billSelect = {
  id: recurringBills.id,
  name: recurringBills.name,
  amount: recurringBills.amount,
  categoryId: recurringBills.categoryId,
  categoryName: expenseCategories.name,
  accountId: recurringBills.accountId,
  accountName: accounts.name,
  recurrence: recurringBills.recurrence,
  dueDate: recurringBills.dueDate,
  active: recurringBills.active,
} as const;

export async function listRecurringBills(): Promise<BillRow[]> {
  const rows = await db
    .select(billSelect)
    .from(recurringBills)
    .innerJoin(expenseCategories, eq(recurringBills.categoryId, expenseCategories.id))
    .innerJoin(accounts, eq(recurringBills.accountId, accounts.id))
    .orderBy(desc(recurringBills.active), asc(recurringBills.dueDate));

  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

/** Active bills due within `days` from `today` — includes anything already overdue. */
export async function getUpcomingBills(today: string, days: number): Promise<BillRow[]> {
  const [y, m, d] = today.split("-").map(Number);
  const horizon = new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);

  const rows = await db
    .select(billSelect)
    .from(recurringBills)
    .innerJoin(expenseCategories, eq(recurringBills.categoryId, expenseCategories.id))
    .innerJoin(accounts, eq(recurringBills.accountId, accounts.id))
    .where(and(eq(recurringBills.active, true), lte(recurringBills.dueDate, horizon)))
    .orderBy(asc(recurringBills.dueDate));

  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

/* -------------------------------------------------------------------------
 * EMIs / loans — tracked separately from `transactions`, same shape as
 * recurring bills (see schema.ts), but with a finite tenure.
 * ---------------------------------------------------------------------- */

export type EmiRow = {
  id: number;
  name: string;
  principalAmount: number;
  emiAmount: number;
  tenureMonths: number;
  installmentsPaid: number;
  accountId: number;
  accountName: string;
  dueDate: string;
  active: boolean;
};

const emiSelect = {
  id: emis.id,
  name: emis.name,
  principalAmount: emis.principalAmount,
  emiAmount: emis.emiAmount,
  tenureMonths: emis.tenureMonths,
  installmentsPaid: emis.installmentsPaid,
  accountId: emis.accountId,
  accountName: accounts.name,
  dueDate: emis.dueDate,
  active: emis.active,
} as const;

export async function listEmis(): Promise<EmiRow[]> {
  const rows = await db
    .select(emiSelect)
    .from(emis)
    .innerJoin(accounts, eq(emis.accountId, accounts.id))
    .orderBy(desc(emis.active), asc(emis.dueDate));

  return rows.map((r) => ({ ...r, principalAmount: Number(r.principalAmount), emiAmount: Number(r.emiAmount) }));
}

/** Active, not-yet-fully-paid EMIs due within `days` from `today` — includes anything already overdue. */
export async function getUpcomingEmis(today: string, days: number): Promise<EmiRow[]> {
  const [y, m, d] = today.split("-").map(Number);
  const horizon = new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);

  const rows = await db
    .select(emiSelect)
    .from(emis)
    .innerJoin(accounts, eq(emis.accountId, accounts.id))
    .where(
      and(
        eq(emis.active, true),
        lte(emis.dueDate, horizon),
        sql`${emis.installmentsPaid} < ${emis.tenureMonths}`,
      ),
    )
    .orderBy(asc(emis.dueDate));

  return rows.map((r) => ({ ...r, principalAmount: Number(r.principalAmount), emiAmount: Number(r.emiAmount) }));
}

/* -------------------------------------------------------------------------
 * Savings goals — progress comes from `goalContributions`, never from the
 * linked account's own balance (see schema.ts for why).
 * ---------------------------------------------------------------------- */

export type SavingsGoalRow = {
  id: number;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  accountId: number;
  accountName: string;
  active: boolean;
  contributed: number;
};

export async function listSavingsGoals(): Promise<SavingsGoalRow[]> {
  const rows = await db
    .select({
      id: savingsGoals.id,
      name: savingsGoals.name,
      targetAmount: savingsGoals.targetAmount,
      targetDate: savingsGoals.targetDate,
      accountId: savingsGoals.accountId,
      accountName: accounts.name,
      active: savingsGoals.active,
      contributed: sql<number>`coalesce(sum(${goalContributions.amount}), 0)`,
    })
    .from(savingsGoals)
    .innerJoin(accounts, eq(savingsGoals.accountId, accounts.id))
    .leftJoin(goalContributions, eq(goalContributions.savingsGoalId, savingsGoals.id))
    .groupBy(savingsGoals.id, accounts.name)
    .orderBy(desc(savingsGoals.active), asc(savingsGoals.name));

  return rows.map((r) => ({ ...r, targetAmount: Number(r.targetAmount), contributed: Number(r.contributed) }));
}

export type ContributionRow = {
  id: number;
  savingsGoalId: number;
  amount: number;
  date: string;
  note: string | null;
};

/** All contributions across every goal, newest first — the UI groups them per goal itself. */
export async function listContributions(): Promise<ContributionRow[]> {
  const rows = await db
    .select({
      id: goalContributions.id,
      savingsGoalId: goalContributions.savingsGoalId,
      amount: goalContributions.amount,
      date: goalContributions.date,
      note: goalContributions.note,
    })
    .from(goalContributions)
    .orderBy(desc(goalContributions.date), desc(goalContributions.id));

  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

/* -------------------------------------------------------------------------
 * Category budgets
 * ---------------------------------------------------------------------- */

export type CategoryBudgetRow = {
  categoryId: number;
  categoryName: string;
  monthlyAmount: number;
  spent: number;
};

/**
 * A LEFT JOIN with the month range as JOIN predicates (not a correlated
 * subquery) — same reasoning as `balanceExpr` above: every column reference
 * stays qualified to a table that's genuinely in this FROM/JOIN.
 */
export async function listCategoryBudgetStatus(
  monthStart: string,
  monthEnd: string,
): Promise<CategoryBudgetRow[]> {
  const rows = await db
    .select({
      categoryId: categoryBudgets.categoryId,
      categoryName: expenseCategories.name,
      monthlyAmount: categoryBudgets.monthlyAmount,
      spent: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(categoryBudgets)
    .innerJoin(expenseCategories, eq(expenseCategories.id, categoryBudgets.categoryId))
    .leftJoin(
      transactions,
      and(
        eq(transactions.categoryId, categoryBudgets.categoryId),
        eq(transactions.type, "expense"),
        gte(transactions.date, monthStart),
        lte(transactions.date, monthEnd),
      ),
    )
    .groupBy(categoryBudgets.categoryId, expenseCategories.name, categoryBudgets.monthlyAmount)
    .orderBy(asc(expenseCategories.name));

  return rows.map((r) => ({ ...r, monthlyAmount: Number(r.monthlyAmount), spent: Number(r.spent) }));
}
