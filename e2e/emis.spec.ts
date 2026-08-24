import { expect, test, type Page } from "@playwright/test";
import { istToday, sql } from "./db";

/**
 * EMIs/loans, against the live stack. The load-bearing test is the payment
 * one: marking an EMI paid must create a real transaction against its linked
 * account, advance the due date one month, and increment installmentsPaid —
 * same triple-effect shape as `markBillPaid`, but with an end (tenure).
 */

const uniq = (label: string) => `E2E ${label} ${Math.random().toString(36).slice(2, 8)}`;

async function setTab(page: Page, tab: "emis" | "accounts") {
  await page.getByTestId("expense-tabs").locator(`[data-value="${tab}"]`).click();
}

const accountRow = (page: Page, name: string) =>
  page.locator(`[data-testid="account-row"][data-name="${name}"]`);
const emiRow = (page: Page, name: string) => page.locator(`[data-testid="emi-row"][data-name="${name}"]`);

async function addAccount(page: Page, name: string) {
  await page.goto("/expenses");
  await setTab(page, "accounts");
  await page.getByText("+ Add account").click();
  const form = page.getByTestId("add-account-form");
  await form.locator('input[name="name"]').fill(name);
  await form.getByRole("button", { name: "Add account" }).click();
  await expect(accountRow(page, name)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("an EMI added mid-tenure shows the right progress and remaining amount", async ({ page }) => {
  const accountName = uniq("LoanAcc");
  const emiName = uniq("Car Loan");

  await addAccount(page, accountName);

  await page.goto("/expenses");
  await setTab(page, "emis");
  await page.getByText("+ Add EMI").click();
  const form = page.getByTestId("add-emi-form");
  await form.locator('input[name="name"]').fill(emiName);
  await form.locator('input[name="amount"]').fill("500000");
  await form.locator('input[name="emiAmount"]').fill("15000");
  await form.locator('input[name="tenureMonths"]').fill("36");
  await form.locator('input[name="installmentsPaid"]').fill("14");
  await form.locator('input[name="dueDate"]').fill(istToday());
  await form.locator('select[name="accountId"]').selectOption({ label: accountName });
  await form.getByRole("button", { name: "Add EMI" }).click();

  const row = emiRow(page, emiName);
  await expect(row).toBeVisible();
  await expect(row).toContainText("14 of 36 paid");
  // 22 installments left * 15000 = 330000
  await expect(row.getByTestId("emi-remaining")).toContainText("3,30,000.00");
});

test("marking an EMI paid creates a transaction, advances the due date, and increments installments paid", async ({
  page,
}) => {
  const accountName = uniq("EmiPayAcc");
  const emiName = uniq("Bike Loan");
  const dueDate = istToday();

  await addAccount(page, accountName);

  await page.goto("/expenses");
  await setTab(page, "emis");
  await page.getByText("+ Add EMI").click();
  const form = page.getByTestId("add-emi-form");
  await form.locator('input[name="name"]').fill(emiName);
  await form.locator('input[name="amount"]').fill("80000");
  await form.locator('input[name="emiAmount"]').fill("4000");
  await form.locator('input[name="tenureMonths"]').fill("24");
  await form.locator('input[name="dueDate"]').fill(dueDate);
  await form.locator('select[name="accountId"]').selectOption({ label: accountName });
  await form.getByRole("button", { name: "Add EMI" }).click();

  const row = emiRow(page, emiName);
  await expect(row).toBeVisible();
  await expect(row).toContainText("0 of 24 paid");

  await row.getByTestId("mark-emi-paid").click();
  await expect(row).toContainText("1 of 24 paid");

  await setTab(page, "accounts");
  await expect(accountRow(page, accountName).getByTestId("account-balance")).toContainText("4,000.00");

  const [y, m] = dueDate.split("-").map(Number);
  const expectedYear = m === 12 ? y + 1 : y;
  const expectedMonth = m === 12 ? 1 : m + 1;
  const [emiDb] = await sql<{ due_date: string; installments_paid: number }>(
    "select due_date::text, installments_paid from emis where name = $1",
    [emiName],
  );
  const [ny, nm] = emiDb.due_date.split("-").map(Number);
  expect(ny).toBe(expectedYear);
  expect(nm).toBe(expectedMonth);
  expect(emiDb.installments_paid).toBe(1);
});

test("an EMI auto-completes and stops accepting payments once the tenure is fully paid", async ({ page }) => {
  const accountName = uniq("PayoffAcc");
  const emiName = uniq("Almost Done Loan");

  await addAccount(page, accountName);

  await page.goto("/expenses");
  await setTab(page, "emis");
  await page.getByText("+ Add EMI").click();
  const form = page.getByTestId("add-emi-form");
  await form.locator('input[name="name"]').fill(emiName);
  await form.locator('input[name="amount"]').fill("6000");
  await form.locator('input[name="emiAmount"]').fill("6000");
  await form.locator('input[name="tenureMonths"]').fill("1");
  await form.locator('input[name="installmentsPaid"]').fill("0");
  await form.locator('input[name="dueDate"]').fill(istToday());
  await form.locator('select[name="accountId"]').selectOption({ label: accountName });
  await form.getByRole("button", { name: "Add EMI" }).click();

  const row = emiRow(page, emiName);
  await row.getByTestId("mark-emi-paid").click();

  await expect(row).toContainText("Completed");
  await expect(row).toHaveAttribute("data-active", "false");
  await expect(row.getByTestId("mark-emi-paid")).toHaveCount(0);
});

test.afterAll(async () => {
  await sql(`
    delete from transactions
    where account_id in (select id from accounts where name like 'E2E %')
  `);
  await sql(`
    delete from emis
    where account_id in (select id from accounts where name like 'E2E %')
  `);
  await sql("delete from accounts where name like 'E2E %'");
});
