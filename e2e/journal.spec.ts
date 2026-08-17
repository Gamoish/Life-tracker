import { expect, test, type Page } from "@playwright/test";
import { istToday, sql } from "./db";

/**
 * Journal, against the live stack. No nav destination — reached only via the
 * Today-embedded widget's "History →" link, so every test starts from "/".
 */

const PASSWORD = process.env.APP_PASSWORD ?? "change-me-now";

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.waitForURL("**/");
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("today's entry saves from the Today widget, persists, and shows in history — editable there too", async ({
  page,
}) => {
  const text = `E2E journal note ${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/");
  const widget = page.getByTestId("journal-today");
  await widget.locator('textarea[name="text"]').fill(text);
  await widget.getByTestId("journal-save").click();
  await expect(widget.getByText("Saved.")).toBeVisible();

  await page.reload();
  await expect(widget.locator('textarea[name="text"]')).toHaveValue(text);

  await page.getByRole("link", { name: "History →" }).click();
  await page.waitForURL("**/journal");
  const row = page.locator(`[data-testid="journal-history-row"][data-date="${istToday()}"]`);
  await expect(row).toContainText(text);

  const updated = `${text} (edited)`;
  await row.getByText("Edit").click();
  await row.locator('textarea[name="text"]').fill(updated);
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row).toContainText(updated);

  await sql("delete from journal_entries where date = current_date");
});

test.afterAll(async () => {
  await sql("delete from journal_entries where text like 'E2E %'");
});
