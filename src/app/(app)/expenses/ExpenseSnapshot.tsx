import { Pill, StatTile } from "@/components/ui";
import { IconWallet } from "@/components/icons";
import { formatShort } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import type { UpcomingItem } from "@/lib/upcoming";
import type { CategoryBudgetRow, MonthSummary, TransactionRow } from "./queries";

/**
 * The compact "glance without opening the module" widget for Today — same
 * contract as `HealthToday`/`HabitCheckList`: props-only, no fetching of its
 * own. No interactivity here (unlike those two) since the spec asks for a
 * read-only summary, not a quick-add surface, for Expenses on Today.
 */
export default function ExpenseSnapshot({
  totalBalance,
  monthSummary,
  recent,
  upcoming,
  budgetStatus,
}: {
  totalBalance: number;
  monthSummary: MonthSummary;
  recent: TransactionRow[];
  /** Bills and EMIs due within the horizon, merged and date-sorted — one list, not two widgets. */
  upcoming: UpcomingItem[];
  budgetStatus: CategoryBudgetRow[];
}) {
  const overCount = budgetStatus.filter((b) => b.spent > b.monthlyAmount).length;

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-3 gap-2">
        <StatTile label="Balance" value={formatMoney(totalBalance)} tone="accent" icon={<IconWallet />} />
        <StatTile label="Income" value={formatMoney(monthSummary.income)} tone="done" hint="This month" />
        <StatTile label="Expense" value={formatMoney(monthSummary.expense)} tone="warn" hint="This month" />
      </dl>

      {recent.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-4 text-center text-sm text-faint">
          No transactions yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {recent.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-raised px-3 py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{t.categoryName}</span>
              <span className="shrink-0 font-mono text-2xs text-faint">{formatShort(t.date)}</span>
              <span
                className={`shrink-0 font-mono text-xs font-semibold tabular-nums ${
                  t.type === "income" ? "text-done" : "text-warn"
                }`}
              >
                {t.type === "income" ? "+" : "−"}
                {formatMoney(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {upcoming.length > 0 && (
        <div>
          <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-faint">
            Due within 7 days
          </p>
          <ul className="space-y-1">
            {upcoming.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                data-testid="upcoming-item"
                data-kind={item.kind}
                className="flex items-center justify-between gap-2 rounded-lg bg-raised px-3 py-1.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                {item.kind === "emi" && (
                  <Pill tone="accent">
                    {item.installmentsPaid}/{item.tenureMonths}
                  </Pill>
                )}
                <Pill tone="neutral">{formatShort(item.dueDate)}</Pill>
                <span className="shrink-0 font-mono text-xs font-semibold tabular-nums">
                  {formatMoney(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {budgetStatus.length > 0 && (
        <p data-testid="budget-over-summary" className="text-2xs text-faint">
          {overCount} of {budgetStatus.length} categor{budgetStatus.length === 1 ? "y" : "ies"} over budget
        </p>
      )}
    </div>
  );
}
