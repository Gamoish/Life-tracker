"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import {
  Button,
  Card,
  Disclosure,
  EmptyState,
  Field,
  Input,
  Pill,
  ProgressBar,
  SectionHeader,
  SegmentedControl,
  Select,
  StatTile,
  TextButton,
  Toggle,
} from "@/components/ui";
import { IconAdd, IconBill, IconLoan, IconPiggyBank, IconTarget, IconWallet } from "@/components/icons";
import { useToast } from "@/components/Toast";
import { formatShort } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import {
  addAccount,
  addBill,
  addCategory,
  addContribution,
  addEmi,
  addSavingsGoal,
  addTransaction,
  adjustAccountBalance,
  deleteAccount,
  deleteBill,
  deleteCategory,
  deleteCategoryBudget,
  deleteContribution,
  deleteEmi,
  deleteSavingsGoal,
  deleteTransaction,
  markBillPaid,
  markEmiPaid,
  setCategoryBudget,
  toggleBillActive,
  toggleEmiActive,
  toggleSavingsGoalActive,
  updateAccount,
  type FormState,
} from "./actions";
import type {
  AccountType,
  AccountWithBalance,
  BillRecurrence,
  BillRow,
  CategoryBudgetRow,
  CategoryNode,
  ContributionRow,
  EmiRow,
  MonthSummary,
  SavingsGoalRow,
  TransactionRow,
  TransactionType,
} from "./queries";

const TABS = [
  "overview",
  "transactions",
  "bills",
  "emis",
  "savings",
  "budgets",
  "accounts",
  "categories",
] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: "Overview",
  transactions: "Transactions",
  bills: "Bills",
  emis: "EMIs",
  savings: "Savings",
  budgets: "Budgets",
  accounts: "Accounts",
  categories: "Categories",
};
const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: "Cash",
  bank: "Bank",
  card: "Card",
  other: "Other",
};

export default function ExpenseView({
  accounts,
  categories,
  transactions,
  bills,
  emis,
  savingsGoals,
  contributions,
  budgetStatus,
  totalBalance,
  monthSummary,
  today,
}: {
  accounts: AccountWithBalance[];
  categories: CategoryNode[];
  transactions: TransactionRow[];
  bills: BillRow[];
  emis: EmiRow[];
  savingsGoals: SavingsGoalRow[];
  contributions: ContributionRow[];
  budgetStatus: CategoryBudgetRow[];
  totalBalance: number;
  monthSummary: MonthSummary;
  today: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <>
      <dl className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatTile label="Total balance" value={formatMoney(totalBalance)} tone="accent" icon={<IconWallet />} />
        <StatTile label="Income" value={formatMoney(monthSummary.income)} tone="done" hint="This month" />
        <StatTile label="Expense" value={formatMoney(monthSummary.expense)} tone="warn" hint="This month" />
      </dl>

      <SegmentedControl
        testId="expense-tabs"
        ariaLabel="Expense view"
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        options={TABS.map((t) => ({ value: t, label: TAB_LABEL[t] }))}
        className="mb-4"
      />

      {tab === "overview" && (
        <OverviewTab transactions={transactions.slice(0, 5)} />
      )}
      {tab === "transactions" && (
        <TransactionsTab
          transactions={transactions}
          accounts={accounts}
          categories={categories}
          today={today}
        />
      )}
      {tab === "bills" && (
        <BillsTab bills={bills} accounts={accounts} categories={categories} today={today} />
      )}
      {tab === "emis" && <EmisTab emis={emis} accounts={accounts} today={today} />}
      {tab === "savings" && (
        <SavingsTab
          goals={savingsGoals}
          contributions={contributions}
          accounts={accounts}
          today={today}
        />
      )}
      {tab === "budgets" && (
        <BudgetsTab budgetStatus={budgetStatus} categories={categories} />
      )}
      {tab === "accounts" && <AccountsTab accounts={accounts} />}
      {tab === "categories" && <CategoriesTab categories={categories} />}
    </>
  );
}

/* ------------------------------------------------------------------------- */

function OverviewTab({ transactions }: { transactions: TransactionRow[] }) {
  return (
    <>
      <SectionHeader title="Recent transactions" />
      <TransactionList transactions={transactions} showDelete={false} />
    </>
  );
}

function TransactionList({
  transactions,
  showDelete,
}: {
  transactions: TransactionRow[];
  showDelete: boolean;
}) {
  const toast = useToast();

  if (transactions.length === 0) {
    return <EmptyState icon={<IconAdd />} title="No transactions yet" hint="Log your first one below." />;
  }

  return (
    <ul className="space-y-1.5">
      {transactions.map((t) => (
        <li
          key={t.id}
          data-testid="transaction-row"
          data-type={t.type}
          data-amount={t.amount}
          className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-3.5 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-medium">{t.categoryName}</span>
              <Pill tone="neutral">{t.accountName}</Pill>
            </div>
            <p className="mt-0.5 font-mono text-2xs text-faint">
              {formatShort(t.date)}
              {t.note ? ` · ${t.note}` : ""}
            </p>
          </div>
          <span
            className={`shrink-0 font-mono text-sm font-semibold tabular-nums ${
              t.type === "income" ? "text-done" : "text-warn"
            }`}
          >
            {t.type === "income" ? "+" : "−"}
            {formatMoney(t.amount)}
          </span>
          {showDelete && (
            <TextButton
              tone="warn"
              data-testid="delete-transaction"
              onClick={() =>
                startTransition(async () => {
                  await deleteTransaction(t.id);
                  toast("Transaction deleted", "warn");
                })
              }
            >
              Delete
            </TextButton>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------------- */

function TransactionsTab({
  transactions,
  accounts,
  categories,
  today,
}: {
  transactions: TransactionRow[];
  accounts: AccountWithBalance[];
  categories: CategoryNode[];
  today: string;
}) {
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const visible = useMemo(
    () =>
      transactions.filter(
        (t) =>
          (accountFilter === "all" || String(t.accountId) === accountFilter) &&
          (categoryFilter === "all" || String(t.categoryId) === categoryFilter),
      ),
    [transactions, accountFilter, categoryFilter],
  );

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-start xl:gap-x-5">
        <FilterRow
          label="Account"
          testId="filter-account"
          value={accountFilter}
          options={accounts.map((a) => ({ value: String(a.id), label: a.name }))}
          onChange={setAccountFilter}
        />
        <FilterRow
          label="Category"
          testId="filter-category"
          value={categoryFilter}
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
          onChange={setCategoryFilter}
        />
      </div>

      <p className="mb-2 font-mono text-2xs tabular-nums text-faint">
        {visible.length} of {transactions.length}
      </p>

      <TransactionList transactions={visible} showDelete />

      <AddTransactionForm accounts={accounts} categories={categories} today={today} className="mt-6" />
    </>
  );
}

function FilterRow({
  label,
  testId,
  value,
  options,
  onChange,
}: {
  label: string;
  testId: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="w-16 shrink-0 pt-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-faint">
        {label}
      </span>
      <SegmentedControl
        testId={testId}
        ariaLabel={label}
        value={value}
        onChange={onChange}
        options={[{ value: "all", label: "all" }, ...options]}
        className="min-w-0"
      />
    </div>
  );
}

function AddTransactionForm({
  accounts,
  categories,
  today,
  className = "",
}: {
  accounts: AccountWithBalance[];
  categories: CategoryNode[];
  today: string;
  className?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(addTransaction, {});
  const [type, setType] = useState<TransactionType>("expense");

  const matchingCategories = categories.filter((c) => c.type === type);

  if (accounts.length === 0) {
    return (
      <p className={`text-xs text-warn ${className}`}>
        Add an account first, on the Accounts tab, before logging a transaction.
      </p>
    );
  }
  if (categories.length === 0) {
    return (
      <p className={`text-xs text-warn ${className}`}>
        Add a category first, on the Categories tab, before logging a transaction.
      </p>
    );
  }

  return (
    <Disclosure label="+ Add transaction" className={className}>
      <form action={action} data-testid="add-transaction-form" className="max-w-xl space-y-2">
        <SegmentedControl
          ariaLabel="Transaction type"
          value={type}
          onChange={(v) => setType(v as TransactionType)}
          options={[
            { value: "expense", label: "Expense", tone: "warn" },
            { value: "income", label: "Income", tone: "done" },
          ]}
        />
        <input type="hidden" name="type" value={type} />

        <div className="flex gap-2">
          <Field label="Amount" className="min-w-0 flex-1">
            <Input name="amount" type="number" min={0.01} step="0.01" required placeholder="0.00" />
          </Field>
          <Field label="Date" className="w-40 shrink-0">
            <Input name="date" type="date" defaultValue={today} required />
          </Field>
        </div>

        <div className="flex gap-2">
          <Field label="Category" className="min-w-0 flex-1">
            <Select name="categoryId" required defaultValue="">
              <option value="" disabled>
                Pick a category…
              </option>
              {matchingCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Account" className="min-w-0 flex-1">
            <Select name="accountId" required defaultValue="">
              <option value="" disabled>
                Pick an account…
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Input name="note" placeholder="Note (optional)" aria-label="Note" />

        <Button type="submit" variant="primary" size="lg">
          Add {type}
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

/* ------------------------------------------------------------------------- */

const BILL_RECURRENCE_LABEL: Record<BillRecurrence, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
};

function BillsTab({
  bills,
  accounts,
  categories,
  today,
}: {
  bills: BillRow[];
  accounts: AccountWithBalance[];
  categories: CategoryNode[];
  today: string;
}) {
  return (
    <>
      {bills.length === 0 ? (
        <EmptyState icon={<IconBill />} title="No recurring bills yet" hint="Add your first one below." />
      ) : (
        <ul className="space-y-1.5">
          {bills.map((b) => (
            <BillRowItem key={b.id} bill={b} />
          ))}
        </ul>
      )}
      <AddBillForm accounts={accounts} categories={categories} today={today} className="mt-6" />
    </>
  );
}

function BillRowItem({ bill }: { bill: BillRow }) {
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <li
      data-testid="bill-row"
      data-name={bill.name}
      data-active={bill.active}
      className={`rounded-card border border-line bg-surface px-3.5 py-2.5 ${bill.active ? "" : "opacity-60"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-medium">{bill.name}</span>
            <Pill tone="neutral">{bill.categoryName}</Pill>
            <Pill tone="neutral">{bill.accountName}</Pill>
          </div>
          <p className="mt-0.5 font-mono text-2xs text-faint">
            {BILL_RECURRENCE_LABEL[bill.recurrence]} · due {formatShort(bill.dueDate)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="font-mono text-sm font-semibold tabular-nums">{formatMoney(bill.amount)}</span>
          <Toggle
            checked={bill.active}
            onChange={(next) => startTransition(() => toggleBillActive(bill.id, next))}
            label={bill.active ? "Deactivate bill" : "Activate bill"}
          />
          {bill.active && (
            <Button
              variant="secondary"
              size="sm"
              data-testid="mark-bill-paid"
              disabled={paying}
              onClick={() =>
                startTransition(async () => {
                  setPaying(true);
                  const result = await markBillPaid(bill.id);
                  setPaying(false);
                  if (result.error) setError(result.error);
                  else toast(`${bill.name} marked paid`, "done");
                })
              }
            >
              Mark paid
            </Button>
          )}
          <TextButton
            tone="warn"
            data-testid="delete-bill"
            onClick={() => startTransition(() => deleteBill(bill.id))}
          >
            Delete
          </TextButton>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-warn">
          {error}
        </p>
      )}
    </li>
  );
}

function AddBillForm({
  accounts,
  categories,
  today,
  className = "",
}: {
  accounts: AccountWithBalance[];
  categories: CategoryNode[];
  today: string;
  className?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(addBill, {});
  const [recurrence, setRecurrence] = useState<BillRecurrence>("monthly");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  if (accounts.length === 0 || expenseCategories.length === 0) {
    return (
      <p className={`text-xs text-warn ${className}`}>
        Add an account and an expense category first, before adding a bill.
      </p>
    );
  }

  return (
    <Disclosure label="+ Add bill" className={className}>
      <form action={action} data-testid="add-bill-form" className="max-w-xl space-y-2">
        <Input name="name" required placeholder="e.g. Netflix" aria-label="Name" />

        <div className="flex gap-2">
          <Field label="Amount" className="min-w-0 flex-1">
            <Input name="amount" type="number" min={0.01} step="0.01" required placeholder="0.00" />
          </Field>
          <Field label="Next due date" className="w-40 shrink-0">
            <Input name="dueDate" type="date" defaultValue={today} required />
          </Field>
        </div>

        <div className="flex gap-2">
          <Field label="Category" className="min-w-0 flex-1">
            <Select name="categoryId" required defaultValue="">
              <option value="" disabled>
                Pick a category…
              </option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Account" className="min-w-0 flex-1">
            <Select name="accountId" required defaultValue="">
              <option value="" disabled>
                Pick an account…
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-muted">Recurrence</span>
          <SegmentedControl
            ariaLabel="Recurrence"
            value={recurrence}
            onChange={(v) => setRecurrence(v as BillRecurrence)}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
          <input type="hidden" name="recurrence" value={recurrence} />
        </div>

        <Button type="submit" variant="primary" size="lg">
          Add bill
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

/* ------------------------------------------------------------------------- */

function EmisTab({
  emis,
  accounts,
  today,
}: {
  emis: EmiRow[];
  accounts: AccountWithBalance[];
  today: string;
}) {
  return (
    <>
      {emis.length === 0 ? (
        <EmptyState icon={<IconLoan />} title="No EMIs yet" hint="Add your first one below." />
      ) : (
        <ul className="space-y-1.5">
          {emis.map((e) => (
            <EmiRowItem key={e.id} emi={e} />
          ))}
        </ul>
      )}
      <AddEmiForm accounts={accounts} today={today} className="mt-6" />
    </>
  );
}

function EmiRowItem({ emi }: { emi: EmiRow }) {
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const remainingInstallments = emi.tenureMonths - emi.installmentsPaid;
  const remainingAmount = remainingInstallments * emi.emiAmount;
  const completed = remainingInstallments <= 0;
  const pct = emi.tenureMonths > 0 ? (emi.installmentsPaid / emi.tenureMonths) * 100 : 0;

  return (
    <li
      data-testid="emi-row"
      data-name={emi.name}
      data-active={emi.active}
      className={`rounded-card border border-line bg-surface px-3.5 py-2.5 ${emi.active ? "" : "opacity-60"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-medium">{emi.name}</span>
            <Pill tone="neutral">{emi.accountName}</Pill>
            {completed && <Pill tone="done">Completed</Pill>}
          </div>
          <p className="mt-0.5 font-mono text-2xs text-faint">
            {emi.installmentsPaid} of {emi.tenureMonths} paid
            {!completed && ` · next due ${formatShort(emi.dueDate)}`}
          </p>
          <ProgressBar value={pct} tone={completed ? "done" : "accent"} className="mt-1.5 max-w-xs" />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span data-testid="emi-remaining" className="font-mono text-sm font-semibold tabular-nums">
            {formatMoney(remainingAmount)}
          </span>
          <span className="font-mono text-2xs text-faint">
            {formatMoney(emi.emiAmount)}/mo · {remainingInstallments} left
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-3 border-t border-line pt-2">
        <Toggle
          checked={emi.active}
          onChange={(next) => startTransition(() => toggleEmiActive(emi.id, next))}
          label={emi.active ? "Deactivate EMI" : "Activate EMI"}
        />
        {emi.active && !completed && (
          <Button
            variant="secondary"
            size="sm"
            data-testid="mark-emi-paid"
            disabled={paying}
            onClick={() =>
              startTransition(async () => {
                setPaying(true);
                const result = await markEmiPaid(emi.id);
                setPaying(false);
                if (result.error) setError(result.error);
                else toast(`${emi.name} marked paid`, "done");
              })
            }
          >
            Mark paid
          </Button>
        )}
        <TextButton
          tone="warn"
          data-testid="delete-emi"
          onClick={() => startTransition(() => deleteEmi(emi.id))}
        >
          Delete
        </TextButton>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-warn">
          {error}
        </p>
      )}
    </li>
  );
}

function AddEmiForm({
  accounts,
  today,
  className = "",
}: {
  accounts: AccountWithBalance[];
  today: string;
  className?: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(addEmi, {});

  if (accounts.length === 0) {
    return (
      <p className={`text-xs text-warn ${className}`}>
        Add an account first, on the Accounts tab, before adding an EMI.
      </p>
    );
  }

  return (
    <Disclosure label="+ Add EMI" className={className}>
      <form action={action} data-testid="add-emi-form" className="max-w-xl space-y-2">
        <Input name="name" required placeholder="e.g. Car Loan" aria-label="Name" />

        <div className="flex gap-2">
          <Field label="Principal amount" className="min-w-0 flex-1">
            <Input name="amount" type="number" min={0.01} step="0.01" required placeholder="0.00" />
          </Field>
          <Field label="EMI amount" className="min-w-0 flex-1">
            <Input name="emiAmount" type="number" min={0.01} step="0.01" required placeholder="0.00" />
          </Field>
        </div>

        <div className="flex gap-2">
          <Field label="Tenure (months)" className="min-w-0 flex-1">
            <Input name="tenureMonths" type="number" min={1} step="1" required placeholder="36" />
          </Field>
          <Field label="Installments already paid" hint="Leave 0 for a fresh loan." className="min-w-0 flex-1">
            <Input name="installmentsPaid" type="number" min={0} step="1" defaultValue={0} />
          </Field>
        </div>

        <div className="flex gap-2">
          <Field label="Next due date" className="min-w-0 flex-1">
            <Input name="dueDate" type="date" defaultValue={today} required />
          </Field>
          <Field label="Account" className="min-w-0 flex-1">
            <Select name="accountId" required defaultValue="">
              <option value="" disabled>
                Pick an account…
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Button type="submit" variant="primary" size="lg">
          Add EMI
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

/* ------------------------------------------------------------------------- */

/**
 * Per-account earmarked-vs-free summary — only accounts with at least one
 * active goal show up here. `allocated` sums contributions across that
 * account's active goals; `free` is the account's live balance minus that.
 * Purely a client-side view over props already fetched for the tab (no extra
 * query), same "derive it from what you already have" instinct as the rest
 * of this module.
 */
function computeAllocations(
  accounts: AccountWithBalance[],
  goals: SavingsGoalRow[],
): { account: AccountWithBalance; allocated: number; free: number }[] {
  const byAccount = new Map<number, number>();
  for (const g of goals) {
    if (!g.active) continue;
    byAccount.set(g.accountId, (byAccount.get(g.accountId) ?? 0) + g.contributed);
  }
  return accounts
    .filter((a) => byAccount.has(a.id))
    .map((a) => {
      const allocated = byAccount.get(a.id)!;
      return { account: a, allocated, free: a.balance - allocated };
    });
}

function SavingsTab({
  goals,
  contributions,
  accounts,
  today,
}: {
  goals: SavingsGoalRow[];
  contributions: ContributionRow[];
  accounts: AccountWithBalance[];
  today: string;
}) {
  const allocations = useMemo(() => computeAllocations(accounts, goals), [accounts, goals]);
  const contributionsByGoal = useMemo(() => {
    const map = new Map<number, ContributionRow[]>();
    for (const c of contributions) {
      const bucket = map.get(c.savingsGoalId);
      if (bucket) bucket.push(c);
      else map.set(c.savingsGoalId, [c]);
    }
    return map;
  }, [contributions]);

  return (
    <>
      {allocations.length > 0 && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {allocations.map(({ account, allocated, free }) => (
            <Card key={account.id} className="p-3.5" data-testid="account-allocation" data-account={account.name}>
              <p className="truncate text-sm font-medium">{account.name}</p>
              <div className="mt-1.5 flex items-center justify-between font-mono text-2xs">
                <span className="text-faint">Earmarked {formatMoney(allocated)}</span>
                <span data-testid="account-free" className={free < 0 ? "text-warn" : "text-done"}>
                  Free {formatMoney(free)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {goals.length === 0 ? (
        <EmptyState icon={<IconPiggyBank />} title="No savings goals yet" hint="Add your first one below." />
      ) : (
        <ul className="space-y-1.5">
          {goals.map((g) => (
            <SavingsGoalRowItem
              key={g.id}
              goal={g}
              contributions={contributionsByGoal.get(g.id) ?? []}
              today={today}
            />
          ))}
        </ul>
      )}
      <AddSavingsGoalForm accounts={accounts} className="mt-6" />
    </>
  );
}

function SavingsGoalRowItem({
  goal,
  contributions,
  today,
}: {
  goal: SavingsGoalRow;
  contributions: ContributionRow[];
  today: string;
}) {
  const pct = goal.targetAmount > 0 ? (goal.contributed / goal.targetAmount) * 100 : 0;
  const reached = goal.contributed >= goal.targetAmount;

  return (
    <li
      data-testid="savings-goal-row"
      data-name={goal.name}
      data-active={goal.active}
      className={`rounded-card border border-line bg-surface px-3.5 py-2.5 ${goal.active ? "" : "opacity-60"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-medium">{goal.name}</span>
            <Pill tone="neutral">{goal.accountName}</Pill>
            {reached && <Pill tone="done">Target reached</Pill>}
          </div>
          <p className="mt-0.5 font-mono text-2xs text-faint">
            {formatMoney(goal.contributed)} of {formatMoney(goal.targetAmount)}
            {goal.targetDate && ` · by ${formatShort(goal.targetDate)}`}
          </p>
          <ProgressBar value={pct} tone={reached ? "done" : "accent"} className="mt-1.5 max-w-xs" />
        </div>
        <span data-testid="savings-goal-percent" className="shrink-0 font-mono text-sm font-semibold tabular-nums">
          {Math.round(Math.min(100, pct))}%
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2">
        <LogContributionForm goalId={goal.id} today={today} />
        <div className="flex shrink-0 items-center gap-3">
          <Toggle
            checked={goal.active}
            onChange={(next) => startTransition(() => toggleSavingsGoalActive(goal.id, next))}
            label={goal.active ? "Deactivate goal" : "Activate goal"}
          />
          <TextButton
            tone="warn"
            data-testid="delete-savings-goal"
            onClick={() => startTransition(() => deleteSavingsGoal(goal.id))}
          >
            Delete
          </TextButton>
        </div>
      </div>

      {contributions.length > 0 && (
        <Disclosure label={`History (${contributions.length})`} className="mt-2">
          <ul className="space-y-1">
            {contributions.map((c) => (
              <li
                key={c.id}
                data-testid="contribution-row"
                className="flex items-center justify-between gap-2 rounded-lg bg-raised px-2.5 py-1.5 text-sm"
              >
                <span className="font-mono text-2xs text-faint">{formatShort(c.date)}</span>
                <span className="font-mono text-xs font-semibold tabular-nums">{formatMoney(c.amount)}</span>
                <TextButton
                  tone="warn"
                  onClick={() => startTransition(() => deleteContribution(c.id))}
                >
                  Delete
                </TextButton>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
    </li>
  );
}

function LogContributionForm({ goalId, today }: { goalId: number; today: string }) {
  const [state, action] = useActionState<FormState, FormData>(addContribution, {});

  return (
    <Disclosure label="+ Log contribution">
      <form action={action} data-testid="add-contribution-form" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="savingsGoalId" value={goalId} />
        <Field label="Amount">
          <Input name="amount" type="number" min={0.01} step="0.01" required placeholder="0.00" className="w-28" />
        </Field>
        <Field label="Date">
          <Input name="date" type="date" defaultValue={today} required className="w-40" />
        </Field>
        <Button type="submit" variant="primary" size="sm">
          Log
        </Button>
        {state.error && (
          <p role="alert" className="w-full text-xs text-warn">
            {state.error}
          </p>
        )}
      </form>
    </Disclosure>
  );
}

function AddSavingsGoalForm({ accounts, className = "" }: { accounts: AccountWithBalance[]; className?: string }) {
  const [state, action] = useActionState<FormState, FormData>(addSavingsGoal, {});

  if (accounts.length === 0) {
    return (
      <p className={`text-xs text-warn ${className}`}>
        Add an account first, on the Accounts tab, before adding a savings goal.
      </p>
    );
  }

  return (
    <Disclosure label="+ Add savings goal" className={className}>
      <form action={action} data-testid="add-savings-goal-form" className="max-w-xl space-y-2">
        <Input name="name" required placeholder="e.g. New Laptop" aria-label="Name" />

        <div className="flex gap-2">
          <Field label="Target amount" className="min-w-0 flex-1">
            <Input name="amount" type="number" min={0.01} step="0.01" required placeholder="0.00" />
          </Field>
          <Field label="Target date" hint="Optional" className="min-w-0 flex-1">
            <Input name="targetDate" type="date" />
          </Field>
        </div>

        <Field label="Account" hint="Where this money is actually being set aside.">
          <Select name="accountId" required defaultValue="">
            <option value="" disabled>
              Pick an account…
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>

        <Button type="submit" variant="primary" size="lg">
          Add goal
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

/* ------------------------------------------------------------------------- */

function BudgetsTab({
  budgetStatus,
  categories,
}: {
  budgetStatus: CategoryBudgetRow[];
  categories: CategoryNode[];
}) {
  return (
    <>
      {budgetStatus.length === 0 ? (
        <EmptyState icon={<IconTarget />} title="No budgets set" hint="Cap a category's monthly spend below." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {budgetStatus.map((b) => (
            <BudgetRow key={b.categoryId} budget={b} />
          ))}
        </div>
      )}
      <SetBudgetForm categories={categories} className="mt-6" />
    </>
  );
}

function BudgetRow({ budget }: { budget: CategoryBudgetRow }) {
  const over = budget.spent > budget.monthlyAmount;
  const pct = budget.monthlyAmount > 0 ? (budget.spent / budget.monthlyAmount) * 100 : 0;

  return (
    <Card
      className="p-3.5"
      data-testid="budget-row"
      data-category={budget.categoryName}
      data-over={over}
    >
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium">{budget.categoryName}</p>
        <TextButton
          tone="warn"
          data-testid="delete-budget"
          onClick={() => startTransition(() => deleteCategoryBudget(budget.categoryId))}
        >
          Remove
        </TextButton>
      </div>
      <ProgressBar value={pct} tone={over ? "warn" : "accent"} />
      <p className="mt-1.5 font-mono text-2xs tabular-nums text-faint">
        {formatMoney(budget.spent)} of {formatMoney(budget.monthlyAmount)}
        {over && <span className="ml-1 text-warn">· over budget</span>}
      </p>
    </Card>
  );
}

function SetBudgetForm({ categories, className = "" }: { categories: CategoryNode[]; className?: string }) {
  const [state, action] = useActionState<FormState, FormData>(setCategoryBudget, {});
  const expenseCategories = categories.filter((c) => c.type === "expense");

  if (expenseCategories.length === 0) {
    return (
      <p className={`text-xs text-warn ${className}`}>
        Add an expense category first, before setting a budget.
      </p>
    );
  }

  return (
    <Disclosure label="+ Set budget" className={className}>
      <form action={action} data-testid="set-budget-form" className="max-w-xl space-y-2">
        <div className="flex gap-2">
          <Field label="Category" className="min-w-0 flex-1">
            <Select name="categoryId" required defaultValue="">
              <option value="" disabled>
                Pick a category…
              </option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Monthly cap" className="w-40 shrink-0">
            <Input name="monthlyAmount" type="number" min={0.01} step="0.01" required placeholder="0.00" />
          </Field>
        </div>
        <Button type="submit" variant="primary" size="lg">
          Save budget
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

/* ------------------------------------------------------------------------- */

function AccountsTab({ accounts }: { accounts: AccountWithBalance[] }) {
  return (
    <>
      {accounts.length === 0 ? (
        <EmptyState icon={<IconAdd />} title="No accounts yet" hint="Add your first one below." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {accounts.map((a) => (
            <AccountRow key={a.id} account={a} />
          ))}
        </div>
      )}
      <AddAccountForm className="mt-6" />
    </>
  );
}

function AccountRow({ account }: { account: AccountWithBalance }) {
  const [editing, setEditing] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(updateAccount, {});
  const [balanceState, balanceAction] = useActionState<FormState, FormData>(adjustAccountBalance, {});
  const [deleteState, setDeleteState] = useState<string | undefined>();
  const toast = useToast();

  return (
    <Card className="p-3.5" data-testid="account-row" data-name={account.name}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{account.name}</p>
          <p className="mt-0.5 font-mono text-2xs text-faint">{ACCOUNT_TYPE_LABEL[account.type]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            data-testid="account-balance"
            className={`font-mono text-sm font-semibold tabular-nums ${
              account.balance < 0 ? "text-warn" : "text-ink"
            }`}
          >
            {formatMoney(account.balance)}
          </span>
          <TextButton
            data-testid="edit-account-balance"
            onClick={() => setEditingBalance((v) => !v)}
          >
            {editingBalance ? "Close" : "Edit balance"}
          </TextButton>
          <TextButton onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit"}</TextButton>
          <TextButton
            tone="warn"
            data-testid="delete-account"
            onClick={() =>
              startTransition(async () => {
                const result = await deleteAccount(account.id);
                if (result.error) setDeleteState(result.error);
                else toast("Account deleted", "warn");
              })
            }
          >
            Delete
          </TextButton>
        </div>
      </div>

      {deleteState && (
        <p role="alert" className="mt-2 text-xs text-warn">
          {deleteState}
        </p>
      )}

      {editingBalance && (
        <form
          action={balanceAction}
          className="mt-3 space-y-2 border-t border-line pt-3"
          data-testid="edit-balance-form"
        >
          <input type="hidden" name="id" value={account.id} />
          <Field label="New balance" hint="Logs a Balance Adjustment transaction for the difference.">
            <div className="flex gap-2">
              <Input
                name="balance"
                type="number"
                step="0.01"
                required
                defaultValue={account.balance}
                aria-label="New balance"
                className="min-w-0 flex-1"
              />
              <Button type="submit" variant="primary" className="shrink-0" data-testid="save-account-balance">
                Save
              </Button>
            </div>
          </Field>
          {balanceState.error && (
            <p role="alert" className="text-xs text-warn">
              {balanceState.error}
            </p>
          )}
          {balanceState.ok && (
            <p className="text-xs text-done">Balance updated — an adjustment transaction was logged.</p>
          )}
        </form>
      )}

      {editing && (
        <form action={action} className="mt-3 space-y-2 border-t border-line pt-3">
          <input type="hidden" name="id" value={account.id} />
          <div className="flex gap-2">
            <Input name="name" defaultValue={account.name} required aria-label="Name" className="min-w-0 flex-1" />
            {/* Wrapped, not widthed directly — Select carries `w-full` from
                the shared kit, and a same-element `w-32` can lose that fight
                depending on Tailwind's generated rule order. */}
            <div className="w-32 shrink-0">
              <Select name="type" defaultValue={account.type} aria-label="Type">
                {(["cash", "bank", "card", "other"] as const).map((t) => (
                  <option key={t} value={t}>
                    {ACCOUNT_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </div>
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
      )}
    </Card>
  );
}

function AddAccountForm({ className = "" }: { className?: string }) {
  const [state, action] = useActionState<FormState, FormData>(addAccount, {});

  return (
    <Disclosure label="+ Add account" className={className}>
      <form action={action} data-testid="add-account-form" className="max-w-xl space-y-2">
        <div className="flex gap-2">
          <Input name="name" required placeholder="e.g. HDFC Savings" aria-label="Name" className="min-w-0 flex-1" />
          <div className="w-32 shrink-0">
            <Select name="type" defaultValue="cash" aria-label="Type">
              {(["cash", "bank", "card", "other"] as const).map((t) => (
                <option key={t} value={t}>
                  {ACCOUNT_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Button type="submit" variant="primary" size="lg">
          Add account
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

/* ------------------------------------------------------------------------- */

function CategoriesTab({ categories }: { categories: CategoryNode[] }) {
  const income = categories.filter((c) => c.type === "income");
  const expense = categories.filter((c) => c.type === "expense");

  return (
    <>
      {categories.length === 0 ? (
        <EmptyState icon={<IconAdd />} title="No categories yet" hint="Add your first one below." />
      ) : (
        <div className="space-y-6">
          <div>
            <SectionHeader title="Income" right={String(income.length)} />
            {income.length === 0 ? (
              <p className="text-sm text-faint">None yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {income.map((c) => (
                  <CategoryRow key={c.id} category={c} />
                ))}
              </div>
            )}
          </div>
          <div>
            <SectionHeader title="Expense" right={String(expense.length)} />
            {expense.length === 0 ? (
              <p className="text-sm text-faint">None yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {expense.map((c) => (
                  <CategoryRow key={c.id} category={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <AddCategoryForm className="mt-6" />
    </>
  );
}

function CategoryRow({ category }: { category: CategoryNode }) {
  const [error, setError] = useState<string | undefined>();
  const toast = useToast();

  return (
    <Card className="p-3 " data-testid="category-row" data-name={category.name} data-type={category.type}>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium">{category.name}</p>
        <TextButton
          tone="warn"
          data-testid="delete-category"
          onClick={() =>
            startTransition(async () => {
              const result = await deleteCategory(category.id);
              if (result.error) setError(result.error);
              else toast("Category deleted", "warn");
            })
          }
        >
          Delete
        </TextButton>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-warn">
          {error}
        </p>
      )}
    </Card>
  );
}

function AddCategoryForm({ className = "" }: { className?: string }) {
  const [state, action] = useActionState<FormState, FormData>(addCategory, {});

  return (
    <Disclosure label="+ Add category" className={className}>
      <form action={action} data-testid="add-category-form" className="max-w-xl space-y-2">
        <div className="flex gap-2">
          <Input name="name" required placeholder="e.g. Groceries" aria-label="Name" className="min-w-0 flex-1" />
          <div className="w-32 shrink-0">
            <Select name="type" defaultValue="expense" aria-label="Type">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </Select>
          </div>
        </div>
        <Button type="submit" variant="primary" size="lg">
          Add category
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
