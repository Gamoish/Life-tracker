import { expect, test, type Page } from "@playwright/test";
import { istToday, sql } from "./db";

/**
 * Savings goals, against the live stack. The load-bearing test is the
 * allocation one: a contribution must NOT touch the linked account's live
 * transaction-derived balance (it's already-existing money, just earmarked),
 * while still counting toward the goal's own progress and the account's
 * "free" figure — see schema.ts's comment on `goalContributions` for why.
 */

const PASSWORD = process.env.APP_PASSWORD ?? "change-me-now";
const uniq = (label: string) => `E2E ${label} ${Math.random().toString(36).slice(2, 8)}`;

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.waitForURL("**/");
}

async function setTab(page: Page, tab: "savings" | "accounts") {
  await page.getByTestId("expense-tabs").locator(`[data-value="${tab}"]`).click();
}

const accountRow = (page: Page, name: string) =>
  page.locator(`[data-testid="account-row"][data-name="${name}"]`);
const goalRow = (page: Page, name: string) =>
  page.locator(`[data-testid="savings-goal-row"][data-name="${name}"]`);

async function addAccount(page: Page, name: string) {
  await page.goto("/expenses");
  await setTab(page, "accounts");
  await page.getByText("+ Add account").click();
  const form = page.getByTestId("add-account-form");
  await form.locator('input[name="name"]').fill(name);
  await form.getByRole("button", { name: "Add account" }).click();
  await expect(accountRow(page, name)).toBeVisible();
}

async function addGoal(page: Page, name: string, target: string, accountName: string) {
  await page.goto("/expenses");
  await setTab(page, "savings");
  await page.getByText("+ Add savings goal").click();
  const form = page.getByTestId("add-savings-goal-form");
  await form.locator('input[name="name"]').fill(name);
  await form.locator('input[name="amount"]').fill(target);
  await form.locator('select[name="accountId"]').selectOption({ label: accountName });
  await form.getByRole("button", { name: "Add goal" }).click();
  await expect(goalRow(page, name)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("logging a contribution updates the goal's progress percentage", async ({ page }) => {
  const accountName = uniq("GoalAcc");
  const goalName = uniq("New Laptop");

  await addAccount(page, accountName);
  await addGoal(page, goalName, "1000", accountName);

  const row = goalRow(page, goalName);
  await expect(row.getByTestId("savings-goal-percent")).toContainText("0%");

  await row.getByText("+ Log contribution").click();
  const form = row.getByTestId("add-contribution-form");
  await form.locator('input[name="amount"]').fill("250");
  await form.locator('input[name="date"]').fill(istToday());
  await form.getByRole("button", { name: "Log" }).click();

  await expect(row.getByTestId("savings-goal-percent")).toContainText("25%");
  await expect(row).toContainText("250.00 of");
});

test("a contribution leaves the account's live balance untouched but shows up as earmarked, reducing the free amount", async ({
  page,
}) => {
  const accountName = uniq("AllocAcc");
  const goalName = uniq("Emergency Fund");

  await addAccount(page, accountName);

  // Give the account a real balance via a normal transaction first.
  await setTab(page, "accounts");
  await accountRow(page, accountName).getByTestId("edit-account-balance").click();
  const balForm = accountRow(page, accountName).getByTestId("edit-balance-form");
  await balForm.locator('input[name="balance"]').fill("5000");
  await balForm.getByTestId("save-account-balance").click();
  await expect(accountRow(page, accountName).getByTestId("account-balance")).toContainText("5,000.00");

  await addGoal(page, goalName, "2000", accountName);
  const row = goalRow(page, goalName);
  await row.getByText("+ Log contribution").click();
  const form = row.getByTestId("add-contribution-form");
  await form.locator('input[name="amount"]').fill("1200");
  await form.locator('input[name="date"]').fill(istToday());
  await form.getByRole("button", { name: "Log" }).click();
  await expect(row).toContainText("1,200.00 of");

  // Balance is untouched by the contribution — still 5000, not 3800.
  await setTab(page, "accounts");
  await expect(accountRow(page, accountName).getByTestId("account-balance")).toContainText("5,000.00");

  // But the Savings tab shows 1200 earmarked, 3800 free.
  await setTab(page, "savings");
  const alloc = page.locator(`[data-testid="account-allocation"][data-account="${accountName}"]`);
  await expect(alloc).toContainText("1,200.00");
  await expect(alloc.getByTestId("account-free")).toContainText("3,800.00");
});

test("deleting a savings goal cascades its contributions", async ({ page }) => {
  const accountName = uniq("DeleteGoalAcc");
  const goalName = uniq("Vacation");

  await addAccount(page, accountName);
  await addGoal(page, goalName, "500", accountName);

  const row = goalRow(page, goalName);
  await row.getByText("+ Log contribution").click();
  const form = row.getByTestId("add-contribution-form");
  await form.locator('input[name="amount"]').fill("100");
  await form.locator('input[name="date"]').fill(istToday());
  await form.getByRole("button", { name: "Log" }).click();
  await expect(row).toContainText("100.00 of");

  const [before] = await sql<{ count: string }>(
    "select count(*)::text from goal_contributions gc join savings_goals sg on sg.id = gc.savings_goal_id where sg.name = $1",
    [goalName],
  );
  expect(Number(before.count)).toBe(1);

  await row.getByTestId("delete-savings-goal").click();
  await expect(row).toHaveCount(0);

  const [after] = await sql<{ count: string }>(
    "select count(*)::text from goal_contributions where savings_goal_id in (select id from savings_goals where name = $1)",
    [goalName],
  );
  expect(Number(after.count)).toBe(0);
});

test.afterAll(async () => {
  await sql(`
    delete from goal_contributions
    where savings_goal_id in (
      select id from savings_goals where account_id in (select id from accounts where name like 'E2E %')
    )
  `);
  await sql(`
    delete from savings_goals
    where account_id in (select id from accounts where name like 'E2E %')
  `);
  await sql(`
    delete from transactions
    where account_id in (select id from accounts where name like 'E2E %')
  `);
  await sql("delete from accounts where name like 'E2E %'");
});
