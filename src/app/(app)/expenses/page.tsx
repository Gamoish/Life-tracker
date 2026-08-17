import { PageHeader } from "@/components/ui";
import { formatShort, monthBounds, today } from "@/lib/date";
import ExpenseView from "./ExpenseView";
import {
  getMonthSummary,
  getTotalBalance,
  listAccounts,
  listCategories,
  listCategoryBudgetStatus,
  listContributions,
  listEmis,
  listRecurringBills,
  listSavingsGoals,
  listTransactions,
} from "./queries";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const day = today();
  const [monthStart, monthEnd] = monthBounds(day);

  const [
    accounts,
    categories,
    transactions,
    totalBalance,
    monthSummary,
    bills,
    emis,
    savingsGoals,
    contributions,
    budgetStatus,
  ] = await Promise.all([
    listAccounts(),
    listCategories(),
    listTransactions(),
    getTotalBalance(),
    getMonthSummary(monthStart, monthEnd),
    listRecurringBills(),
    listEmis(),
    listSavingsGoals(),
    listContributions(),
    listCategoryBudgetStatus(monthStart, monthEnd),
  ]);

  return (
    <>
      <PageHeader title="Expenses" subtitle={formatShort(day)} />
      <ExpenseView
        accounts={accounts}
        categories={categories}
        transactions={transactions}
        bills={bills}
        emis={emis}
        savingsGoals={savingsGoals}
        contributions={contributions}
        budgetStatus={budgetStatus}
        totalBalance={totalBalance}
        monthSummary={monthSummary}
        today={day}
      />
    </>
  );
}
