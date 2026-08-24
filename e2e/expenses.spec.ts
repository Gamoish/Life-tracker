import { expect, test, type Page } from "@playwright/test";
import { istToday, sql } from "./db";

/**
 * Expense tracker, against the live stack.
 *
 * The load-bearing test is the balance one: an account's balance is never
 * stored, only ever computed live as sum(income) - sum(expense), so adding
 * an income and an expense transaction and reading the balance back proves
 * that computation end to end through the DB aggregate and the Accounts tab.
 */

const uniq = (label: string) => `E2E ${label} ${Math.random().toString(36).slice(2, 8)}`;

async function setTab(
  page: Page,
  tab: "overview" | "transactions" | "bills" | "budgets" | "accounts" | "categories",
) {
  await page.getByTestId("expense-tabs").locator(`[data-value="${tab}"]`).click();
}

const accountRow = (page: Page, name: string) =>
  page.locator(`[data-testid="account-row"][data-name="${name}"]`);
const categoryRow = (page: Page, name: string) =>
  page.locator(`[data-testid="category-row"][data-name="${name}"]`);

async function addAccount(page: Page, name: string) {
  await page.goto("/expenses");
  await setTab(page, "accounts");
  await page.getByText("+ Add account").click();
  const form = page.getByTestId("add-account-form");
  await form.locator('input[name="name"]').fill(name);
  await form.getByRole("button", { name: "Add account" }).click();
  await expect(accountRow(page, name)).toBeVisible();
}

async function addCategory(page: Page, name: string, type: "income" | "expense") {
  await page.goto("/expenses");
  await setTab(page, "categories");
  await page.getByText("+ Add category").click();
  const form = page.getByTestId("add-category-form");
  await form.locator('input[name="name"]').fill(name);
  await form.locator('select[name="type"]').selectOption(type);
  await form.getByRole("button", { name: "Add category" }).click();
  await expect(categoryRow(page, name)).toBeVisible();
}

async function addTransaction(
  page: Page,
  opts: { type: "income" | "expense"; amount: string; category: string; account: string },
) {
  await page.goto("/expenses");
  await setTab(page, "transactions");
  await page.getByText("+ Add transaction").click();

  const form = page.getByTestId("add-transaction-form");
  await form
    .getByRole("group", { name: "Transaction type" })
    .locator(`[data-value="${opts.type}"]`)
    .click();
  await form.locator('input[name="amount"]').fill(opts.amount);
  await form.locator('select[name="categoryId"]').selectOption({ label: opts.category });
  await form.locator('select[name="accountId"]').selectOption({ label: opts.account });
  await form.getByRole("button", { name: new RegExp(`Add ${opts.type}`, "i") }).click();
  await page.waitForLoadState("networkidle");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("an income and an expense transaction update the account balance correctly", async ({
  page,
}) => {
  const accountName = uniq("Wallet");
  const incomeCategory = uniq("Salary");
  const expenseCategory = uniq("Groceries");

  await addAccount(page, accountName);
  await addCategory(page, incomeCategory, "income");
  await addCategory(page, expenseCategory, "expense");

  await addTransaction(page, {
    type: "income",
    amount: "1000",
    category: incomeCategory,
    account: accountName,
  });
  await addTransaction(page, {
    type: "expense",
    amount: "350.50",
    category: expenseCategory,
    account: accountName,
  });

  // 1000 - 350.50 = 649.50
  await page.goto("/expenses");
  await setTab(page, "accounts");
  await expect(accountRow(page, accountName).getByTestId("account-balance")).toContainText("649.50");
});

test("editing an account balance logs exactly one adjustment transaction and updates everywhere", async ({
  page,
}) => {
  const accountName = uniq("Adjustable");

  await addAccount(page, accountName);
  const row = accountRow(page, accountName);

  // A fresh account starts at 0.00 — bump it up to 250.00.
  await row.getByTestId("edit-account-balance").click();
  const form = row.getByTestId("edit-balance-form");
  await form.locator('input[name="balance"]').fill("250");
  await form.getByTestId("save-account-balance").click();
  await expect(row.getByTestId("account-balance")).toContainText("250.00");

  // Exactly one adjustment transaction, for the full delta, on the income side.
  await setTab(page, "transactions");
  const adjustmentRows = page.locator('[data-testid="transaction-row"]').filter({ hasText: accountName });
  await expect(adjustmentRows).toHaveCount(1);
  await expect(adjustmentRows).toContainText("Balance Adjustment");
  await expect(adjustmentRows).toContainText("250.00");

  // Correct it back down to 100.00 -> a second, expense-side adjustment —
  // never a silent overwrite of the stored balance, since there isn't one.
  // Switching tabs unmounts AccountsTab, so the edit form has to be reopened.
  await setTab(page, "accounts");
  await row.getByTestId("edit-account-balance").click();
  await form.locator('input[name="balance"]').fill("100");
  await form.getByTestId("save-account-balance").click();
  await expect(row.getByTestId("account-balance")).toContainText("100.00");

  await setTab(page, "transactions");
  await expect(adjustmentRows).toHaveCount(2);
});

test("transactions filter by account and by category, combined", async ({ page }) => {
  const accountA = uniq("AccA");
  const accountB = uniq("AccB");
  const categoryX = uniq("CatX");
  const categoryY = uniq("CatY");

  await addAccount(page, accountA);
  await addAccount(page, accountB);
  await addCategory(page, categoryX, "expense");
  await addCategory(page, categoryY, "expense");

  await addTransaction(page, { type: "expense", amount: "11.13", category: categoryX, account: accountA });
  await addTransaction(page, { type: "expense", amount: "22.24", category: categoryY, account: accountB });

  await page.goto("/expenses");
  await setTab(page, "transactions");

  // Scoped by the unique account/category name (rendered as visible text in
  // the row), not the amount — avoids any risk of colliding with unrelated
  // transactions that happen to share a round amount.
  const rows = page.locator('[data-testid="transaction-row"]');
  const rowA = rows.filter({ hasText: accountA });
  const rowB = rows.filter({ hasText: accountB });

  // Filter to account A: only its row shows.
  await page.getByTestId("filter-account").locator(`text=${accountA}`).click();
  await expect(rowA).toBeVisible();
  await expect(rowB).toHaveCount(0);

  // Combine with a category filter that contradicts -> empty.
  await page.getByTestId("filter-category").locator(`text=${categoryY}`).click();
  await expect(rowA).toHaveCount(0);
  await expect(rowB).toHaveCount(0);

  // Reset both.
  await page.getByTestId("filter-account").locator('[data-value="all"]').click();
  await page.getByTestId("filter-category").locator('[data-value="all"]').click();
  await expect(rowA).toBeVisible();
  await expect(rowB).toBeVisible();
});

test("deleting an account or category still in use is blocked with a clear reason", async ({ page }) => {
  const accountName = uniq("Locked");
  const categoryName = uniq("LockedCat");

  await addAccount(page, accountName);
  await addCategory(page, categoryName, "expense");
  await addTransaction(page, { type: "expense", amount: "5", category: categoryName, account: accountName });

  await page.goto("/expenses");
  await setTab(page, "accounts");
  await accountRow(page, accountName).getByTestId("delete-account").click();
  await expect(accountRow(page, accountName)).toBeVisible(); // still there
  await expect(accountRow(page, accountName)).toContainText("Can't delete");

  await setTab(page, "categories");
  await categoryRow(page, categoryName).getByTestId("delete-category").click();
  await expect(categoryRow(page, categoryName)).toBeVisible();
  await expect(categoryRow(page, categoryName)).toContainText("Can't delete");
});

test("a recurring bill can be added, marked paid — creating a transaction and advancing its due date — and deleted", async ({
  page,
}) => {
  const accountName = uniq("BillAcc");
  const categoryName = uniq("BillCat");
  const billName = uniq("Subscription");
  const dueDate = istToday();

  await addAccount(page, accountName);
  await addCategory(page, categoryName, "expense");

  await page.goto("/expenses");
  await setTab(page, "bills");
  await page.getByText("+ Add bill").click();
  const form = page.getByTestId("add-bill-form");
  await form.locator('input[name="name"]').fill(billName);
  await form.locator('input[name="amount"]').fill("199");
  await form.locator('input[name="dueDate"]').fill(dueDate);
  await form.locator('select[name="categoryId"]').selectOption({ label: categoryName });
  await form.locator('select[name="accountId"]').selectOption({ label: accountName });
  await form.getByRole("button", { name: "Add bill" }).click();

  const row = page.locator(`[data-testid="bill-row"][data-name="${billName}"]`);
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("data-active", "true");

  // Marking paid does NOT happen automatically when a due date passes — it's
  // this explicit click, which both logs a real transaction and advances the
  // bill forward one recurrence, in the same action.
  await row.getByTestId("mark-bill-paid").click();

  await setTab(page, "transactions");
  const txnRow = page.locator('[data-testid="transaction-row"]').filter({ hasText: billName });
  await expect(txnRow).toBeVisible();
  await expect(txnRow).toContainText("199.00");

  const [y, m] = dueDate.split("-").map(Number);
  const expectedYear = m === 12 ? y + 1 : y;
  const expectedMonth = m === 12 ? 1 : m + 1;
  const [billRow] = await sql<{ due_date: string }>(
    "select due_date::text from recurring_bills where name = $1",
    [billName],
  );
  const [ny, nm] = billRow.due_date.split("-").map(Number);
  expect(ny).toBe(expectedYear);
  expect(nm).toBe(expectedMonth);

  await setTab(page, "bills");
  await row.getByTestId("delete-bill").click();
  await expect(row).toHaveCount(0);
});

test("a category budget shows spend against its cap and rolls into the Budgets tab's over-budget summary", async ({
  page,
}) => {
  const accountName = uniq("BudgetAcc");
  const categoryName = uniq("BudgetCat");

  await addAccount(page, accountName);
  await addCategory(page, categoryName, "expense");

  // The summary line only renders once at least one budget exists anywhere
  // in the system — with none yet, `.count()` is 0 rather than the element
  // being present with "0 of 0" text.
  await page.goto("/expenses");
  await setTab(page, "budgets");
  const summaryBefore = page.getByTestId("budget-over-summary");
  const [beforeOver, beforeTotal] =
    (await summaryBefore.count()) > 0
      ? (await summaryBefore.textContent())!.match(/(\d+) of (\d+)/)!.slice(1).map(Number)
      : [0, 0];

  await page.getByText("+ Set budget").click();
  const form = page.getByTestId("set-budget-form");
  await form.locator('select[name="categoryId"]').selectOption({ label: categoryName });
  await form.locator('input[name="monthlyAmount"]').fill("100");
  await form.getByRole("button", { name: "Save budget" }).click();

  const row = page.locator(`[data-testid="budget-row"][data-category="${categoryName}"]`);
  await expect(row).toBeVisible();
  await expect(row).toContainText("0.00 of");
  await expect(row).toHaveAttribute("data-over", "false");

  await addTransaction(page, { type: "expense", amount: "150", category: categoryName, account: accountName });

  await page.goto("/expenses");
  await setTab(page, "budgets");
  await expect(row).toContainText("over budget");
  await expect(row).toHaveAttribute("data-over", "true");

  await page.goto("/expenses");
  await setTab(page, "budgets");
  await expect(page.getByTestId("budget-over-summary")).toContainText(
    `${beforeOver + 1} of ${beforeTotal + 1}`,
  );
});

test.afterAll(async () => {
  // Bills first — they're also ON DELETE RESTRICT against accounts/categories,
  // same reasoning as transactions below.
  await sql(`
    delete from recurring_bills
    where account_id in (select id from accounts where name like 'E2E %')
       or category_id in (select id from expense_categories where name like 'E2E %')
  `);
  // Transactions next — accounts/categories are ON DELETE RESTRICT, so they
  // can't go until nothing references them.
  await sql(`
    delete from transactions
    where account_id in (select id from accounts where name like 'E2E %')
       or category_id in (select id from expense_categories where name like 'E2E %')
  `);
  await sql("delete from accounts where name like 'E2E %'");
  await sql("delete from expense_categories where name like 'E2E %'");
});
