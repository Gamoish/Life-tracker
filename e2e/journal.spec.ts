import { expect, test } from "@playwright/test";
import { istToday, sql } from "./db";

/** Journal, against the live stack — a full nav destination at /journal. */

test.beforeEach(async ({ page }) => {
  await page.goto("/journal");
});

test("today's entry saves from the entry form and persists", async ({ page }) => {
  const text = `E2E journal note ${Math.random().toString(36).slice(2, 8)}`;

  const widget = page.getByTestId("journal-today");
  await widget.locator('textarea[name="text"]').fill(text);
  await widget.getByTestId("journal-save").click();
  await expect(widget.getByText("Saved.")).toBeVisible();

  await page.reload();
  await expect(widget.locator('textarea[name="text"]')).toHaveValue(text);

  // Today's own entry stays in the form above, not the "Earlier entries" list.
  await expect(
    page.locator(`[data-testid="journal-history-row"][data-date="${istToday()}"]`),
  ).toHaveCount(0);

  await sql("delete from journal_entries where date = current_date");
});

test("an earlier entry shows in history and is editable there", async ({ page }) => {
  const date = istToday(-1);
  const text = `E2E journal note ${Math.random().toString(36).slice(2, 8)}`;
  await sql("insert into journal_entries (date, text) values ($1, $2)", [date, text]);

  await page.reload();
  const row = page.locator(`[data-testid="journal-history-row"][data-date="${date}"]`);
  await expect(row).toContainText(text);

  const updated = `${text} (edited)`;
  await row.getByText("Edit").click();
  await row.locator('textarea[name="text"]').fill(updated);
  await row.getByRole("button", { name: "Save" }).click();
  await expect(row).toContainText(updated);
});

test.afterAll(async () => {
  await sql("delete from journal_entries where text like 'E2E %'");
});
