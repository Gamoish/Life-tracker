import fs from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { sql } from "./db";

/** Settings and the data export, against the live stack. */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("the daily calorie goal saves and drives the progress indicator on Health", async ({ page }) => {
  await page.goto("/settings");
  const form = page.locator("form").filter({ has: page.getByTestId("save-calorie-goal") });
  await form.locator('input[name="calorieGoal"]').fill("1800");
  await page.getByTestId("save-calorie-goal").click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto("/health");
  await expect(page.getByText(/\/ 1800 cal/)).toBeVisible();

  // Leave it blank again so it doesn't leak into other runs.
  await page.goto("/settings");
  await form.locator('input[name="calorieGoal"]').fill("");
  await page.getByTestId("save-calorie-goal").click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto("/health");
  await expect(page.getByText(/\/ 1800 cal/)).toHaveCount(0);
});

test("bottle size, daily water goal, and weight unit save and drive Health", async ({ page }) => {
  await page.goto("/settings");

  const waterForm = page.locator("form").filter({ has: page.getByTestId("save-water-settings") });
  await waterForm.locator('input[name="bottleSizeMl"]').fill("750");
  await waterForm.locator('input[name="dailyWaterGoalMl"]').fill("3000");
  await page.getByTestId("save-water-settings").click();

  const weightForm = page.locator("form").filter({ has: page.getByTestId("save-weight-unit") });
  await weightForm.locator('select[name="weightUnit"]').selectOption("lbs");
  await page.getByTestId("save-weight-unit").click();
  await expect.poll(async () => {
    const rows = await sql<{ weight_unit: string }>("select weight_unit from app_settings where id = 1");
    return rows[0]?.weight_unit;
  }).toBe("lbs");

  // Both preferences drive the Health quick-log widgets immediately.
  await page.goto("/health");
  await expect(page.getByTestId("water-bottle")).toContainText("750ml");
  await expect(page.getByTestId("water-total")).toContainText("/ 3000 ml");
  await expect(page.getByTestId("weight-quick-log")).toContainText("lbs");

  // Restore the defaults so they don't leak into other runs.
  await page.goto("/settings");
  await waterForm.locator('input[name="bottleSizeMl"]').fill("500");
  await waterForm.locator('input[name="dailyWaterGoalMl"]').fill("2500");
  await page.getByTestId("save-water-settings").click();
  await weightForm.locator('select[name="weightUnit"]').selectOption("kg");
  await page.getByTestId("save-weight-unit").click();
});

test("data export downloads one JSON file with data from every module", async ({ page }) => {
  await page.goto("/settings");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("export-data-link").click(),
  ]);

  const path = await download.path();
  expect(path).toBeTruthy();
  const raw = await fs.readFile(path!, "utf-8");
  const data = JSON.parse(raw);

  expect(typeof data.exportedAt).toBe("string");
  for (const key of [
    "tasks",
    "taskCompletions",
    "habits",
    "habitLogs",
    "goals",
    "goalMilestones",
    "roadmaps",
    "roadmapTopics",
    "accounts",
    "expenseCategories",
    "transactions",
    "recurringBills",
    "categoryBudgets",
    "dailyHealth",
    "sleepLogs",
    "workouts",
    "foodLogs",
    "waterLogs",
    "journalEntries",
  ]) {
    expect(Array.isArray(data[key]), `${key} should be an array`).toBe(true);
  }
});

test.afterAll(async () => {
  await sql(
    "update app_settings set calorie_goal = null, bottle_size_ml = 500, daily_water_goal_ml = 2500, weight_unit = 'kg' where id = 1",
  );
});
