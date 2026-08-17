import { expect, test, type Page } from "@playwright/test";
import { istToday, sql } from "./db";

/**
 * Health, against the live stack. Every test cleans up its own rows so the
 * suite is safe to re-run — there's no `uniq()` isolation trick available for
 * `daily_health`/`sleep_logs` (one row per DAY, not per item); `water_logs`
 * is now an event log, so its own test cleans up by deleting the specific
 * rows it added instead.
 */

const PASSWORD = process.env.APP_PASSWORD ?? "change-me-now";
const uniq = (label: string) => `E2E ${label} ${Math.random().toString(36).slice(2, 8)}`;

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.waitForURL("**/");
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("a bottle tap and a custom amount both add to today's water total and persist", async ({ page }) => {
  const settingsRows = await sql<{ bottle_size_ml: number; daily_water_goal_ml: number }>(
    "select bottle_size_ml, daily_water_goal_ml from app_settings where id = 1",
  );
  const bottleSize = settingsRows[0]?.bottle_size_ml ?? 500;
  const goal = settingsRows[0]?.daily_water_goal_ml ?? 2500;

  await page.goto("/health");
  const total = page.getByTestId("water-total");
  const before = Number((await total.innerText()).split("/")[0].trim());

  await page.getByTestId("water-bottle").click();
  await expect(total).toContainText(`${before + bottleSize} / ${goal} ml`);

  await page.getByTestId("water-custom-input").fill("111");
  await page.getByTestId("water-custom-submit").click();
  await expect(total).toContainText(`${before + bottleSize + 111} / ${goal} ml`);

  await page.reload();
  await expect(total).toContainText(`${before + bottleSize + 111} / ${goal} ml`); // persisted

  // Both taps land in today's water history, summed into one total.
  const historyDay = page.locator(`[data-testid="water-history-day"][data-date="${istToday()}"]`);
  await expect(historyDay).toContainText(`${before + bottleSize + 111} ml`);

  // Undo both, through the same history list's delete — same entry-level
  // correction path a mis-tap would use — leaving the day clean for a re-run.
  // Newest-added sort last, so these are exactly the two rows this test made.
  // Waiting on `total` between clicks (rather than firing both blind) gives
  // each delete's revalidation time to land before the next one targets
  // whatever row is now actually last in the re-rendered list.
  const deleteButtons = historyDay.getByTestId("delete-water");
  await deleteButtons.last().click();
  await expect(total).toContainText(`${before + bottleSize} / ${goal} ml`);
  await deleteButtons.last().click();
  await expect(total).toContainText(`${before} / ${goal} ml`);
});

test("quick-add food appears immediately and can be deleted", async ({ page }) => {
  const item = uniq("snack");

  await page.goto("/health");
  const form = page.getByTestId("quick-add-food-form");
  await form.locator('input[name="item"]').fill(item);
  await form.locator('input[name="calories"]').fill("250");
  await form.getByRole("button", { name: "Log" }).click();

  const entry = page.locator(`[data-testid="food-entry"][data-item="${item}"]`);
  await expect(entry).toBeVisible();
  await expect(entry).toContainText("250 cal");

  await page.reload();
  await expect(entry).toBeVisible(); // persisted

  await entry.getByTestId("delete-food").click();
  await expect(entry).toHaveCount(0);
});

test("quick-add food records an optional meal type", async ({ page }) => {
  const item = uniq("lunch item");

  await page.goto("/health");
  const form = page.getByTestId("quick-add-food-form");
  await form.locator('input[name="item"]').fill(item);
  await form.locator('select[name="meal"]').selectOption("lunch");
  await form.locator('input[name="calories"]').fill("300");
  await form.getByRole("button", { name: "Log" }).click();

  const entry = page.locator(`[data-testid="food-entry"][data-item="${item}"]`);
  await expect(entry).toContainText("Lunch");

  await entry.getByTestId("delete-food").click();
  await expect(entry).toHaveCount(0);
});

test("steps/weight save with partial updates and clear independently", async ({ page }) => {
  const day = istToday();
  const pollSteps = () =>
    expect.poll(async () => {
      const [row] = await sql<{ steps: number | null }>(
        "select steps from daily_health where date = $1",
        [day],
      );
      return row?.steps ?? null;
    });

  await page.goto("/health");

  const stepsInput = page.locator('input[name="steps"]');
  const weightInput = page.locator('input[name="weightKg"]');

  await stepsInput.fill("8500");
  await weightInput.fill("70");
  await page.getByRole("button", { name: "Save" }).click();

  // A server-action form submit isn't a page navigation Playwright can await
  // by itself, so confirm the mutation actually landed before reloading —
  // otherwise the reload can race ahead of it and read stale data.
  await pollSteps().toBe(8500);

  await page.reload();
  await expect(stepsInput).toHaveValue("8500");
  await expect(weightInput).toHaveValue("70");

  // Saving steps ALONE must not clobber the weight already stored.
  await stepsInput.fill("9000");
  await page.getByRole("button", { name: "Save" }).click();
  await pollSteps().toBe(9000);

  await page.reload();
  await expect(stepsInput).toHaveValue("9000");
  await expect(weightInput).toHaveValue("70");

  // Clearing steps explicitly erases only that field.
  await page.getByTestId("clear-steps").click();
  await pollSteps().toBe(null);

  await page.reload();
  await expect(stepsInput).toHaveValue("");
  await expect(weightInput).toHaveValue("70");

  // Leave the day clean for a re-run.
  await page.getByTestId("clear-weightKg").click();
});

test("sleep logs via bed/wake time and shows in the history list", async ({ page }) => {
  await page.goto("/health");

  const quickLog = page.getByTestId("sleep-quick-log");
  await quickLog.locator('input[name="bedTime"]').fill("23:00");
  await quickLog.locator('input[name="wakeTime"]').fill("06:30");
  await page.getByTestId("sleep-log-submit").click();

  await expect(quickLog).toContainText("23:00 → 06:30");

  await page.reload();
  await expect(quickLog).toContainText("23:00 → 06:30"); // persisted

  const row = page.locator(`[data-testid="sleep-history-row"][data-date="${istToday()}"]`);
  await expect(row).toBeVisible();
  await expect(row).toContainText("7h 30m");

  // Leave the day clean for a re-run — there's no "clear sleep" UI action,
  // just the upsert, so this goes straight to the row this test itself added.
  await sql("delete from sleep_logs where date = current_date");
});

test("a weight quick-log appears in the weight trend history", async ({ page }) => {
  await page.goto("/health");

  const quickLog = page.getByTestId("weight-quick-log");
  await quickLog.locator('input[name="weight"]').fill("71.4");
  await page.getByTestId("weight-log-submit").click();

  await expect(quickLog).toContainText("71.4 kg");

  const row = page.locator(`[data-testid="weight-history-row"][data-date="${istToday()}"]`);
  await expect(row).toBeVisible();
  await expect(row).toContainText("71.4 kg");

  // Leave the day clean for a re-run.
  await page.getByTestId("clear-weightKg").click();
});

test("a workout can be added, edited and deleted, and shows its date", async ({ page }) => {
  const type = uniq("Run");

  await page.goto("/health");
  await page.getByText("+ Add workout").click();

  const addForm = page.getByTestId("add-workout-form");
  await addForm.locator('input[name="type"]').fill(type);
  await addForm.locator('input[name="durationMin"]').fill("30");
  await addForm.getByRole("button", { name: "Add workout" }).click();

  const row = page.locator(`[data-testid="workout-row"][data-type="${type}"]`);
  await expect(row).toBeVisible();
  await expect(row).toContainText("30 min");
  await expect(row).toHaveAttribute("data-date", istToday()); // logged for today

  await row.getByText("Edit").click();
  const editForm = row.locator("form");
  await editForm.locator('input[name="durationMin"]').fill("45");
  await editForm.getByRole("button", { name: "Save" }).click();
  await expect(row).toContainText("45 min");

  await page.reload();
  await expect(page.locator(`[data-testid="workout-row"][data-type="${type}"]`)).toContainText(
    "45 min",
  );

  await page
    .locator(`[data-testid="workout-row"][data-type="${type}"]`)
    .getByText("Delete")
    .click();
  await expect(page.locator(`[data-testid="workout-row"][data-type="${type}"]`)).toHaveCount(0);
});

test("logging a workout today extends the workout streak and this week's total", async ({
  page,
}) => {
  const type = uniq("Cycle");

  await page.goto("/health");
  const streakBefore = Number(await page.getByTestId("workout-streak-tile").getAttribute("data-value"));
  const weekBefore = Number(await page.getByTestId("workout-week-tile").getAttribute("data-value"));

  await page.getByText("+ Add workout").click();
  const addForm = page.getByTestId("add-workout-form");
  await addForm.locator('input[name="type"]').fill(type);
  await addForm.locator('input[name="durationMin"]').fill("20");
  await addForm.getByRole("button", { name: "Add workout" }).click();
  await expect(page.locator(`[data-testid="workout-row"][data-type="${type}"]`)).toBeVisible();

  // A logged-today workout means the streak is at least 1, and the week total
  // grew by exactly this session's minutes. `page.reload()` is a fresh fetch,
  // so a direct assertion (not `expect.poll`) is enough — the value can't
  // change again without another reload.
  await page.reload();
  const streakAfter = Number(await page.getByTestId("workout-streak-tile").getAttribute("data-value"));
  expect(streakAfter).toBeGreaterThanOrEqual(Math.max(1, streakBefore));
  await expect(page.getByTestId("workout-week-tile")).toHaveAttribute(
    "data-value",
    String(weekBefore + 20),
  );

  // Also reflected in the Consistency card's own workout-streak tile.
  const consistencyStreak = Number(
    await page.getByTestId("consistency-workout-streak-tile").getAttribute("data-value"),
  );
  expect(consistencyStreak).toBeGreaterThanOrEqual(1);

  await page
    .locator(`[data-testid="workout-row"][data-type="${type}"]`)
    .getByText("Delete")
    .click();
});

test("the Health consistency heatmap and logging streak render", async ({ page }) => {
  await page.goto("/health");
  await expect(page.getByText("Consistency")).toBeVisible();
  await expect(page.getByTestId("logging-streak-tile")).toBeVisible();
  // Logging anything (water is always present from other tests) keeps the
  // streak sane — just assert it's a non-negative number, not a specific one,
  // since other tests in this file also contribute to "today".
  const value = Number(await page.getByTestId("logging-streak-tile").getAttribute("data-value"));
  expect(value).toBeGreaterThanOrEqual(0);
});

test.afterAll(async () => {
  // Belt-and-braces: remove anything an interrupted run might have left behind.
  await sql("delete from food_logs where item like 'E2E %'");
  await sql("delete from workouts where type like 'E2E %'");
});
