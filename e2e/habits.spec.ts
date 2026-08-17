import { expect, test, type Locator, type Page } from "@playwright/test";
import { cleanup, isoWeekdayOf, istToday, sql } from "./db";

/**
 * Habits, against the live stack.
 *
 * Streak scenarios need PAST logs, which the UI can't produce (it only toggles
 * today), so those days are seeded directly and then read back through the
 * rendered badge — proving the server and the pure lib agree.
 *
 * The exhaustive "which weekday combinations break vs. skip a streak" matrix
 * is covered by the isolation tests in src/lib/habit-streak.test.ts against a
 * fixed anchor date; this suite proves the DB + UI wiring around that rule
 * (scheduled days persist, the check-off list filters by them, streaks
 * recompute from real rows) without re-deriving every case against the live
 * clock, which would only make the suite more fragile for no extra coverage.
 */

const PASSWORD = process.env.APP_PASSWORD ?? "change-me-now";
const uniq = (label: string) => `E2E ${label} ${Math.random().toString(36).slice(2, 8)}`;

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.waitForURL("**/");
}

const habitRow = (page: Page, name: string) =>
  page.locator(`[data-testid="habit-row"][data-name="${name}"]`);

const managedHabit = (page: Page, name: string) =>
  page.locator(`[data-testid="managed-habit"][data-name="${name}"]`);

/** The day-picker renders a checkbox per weekday; its LABEL is what's visible
    and clickable — the input itself is visually hidden (sr-only). */
function dayToggle(scope: Locator, day: number) {
  return scope.locator(`label:has(input[data-testid="day-${day}"])`);
}

/** Ticks/unticks the picker (which defaults to all 7 days selected) to match `days`. */
async function setScheduledDays(scope: Locator, days: number[]) {
  for (let day = 1; day <= 7; day++) {
    const checkbox = scope.getByTestId(`day-${day}`);
    const checked = await checkbox.isChecked();
    const want = days.includes(day);
    if (checked !== want) await dayToggle(scope, day).click();
  }
}

async function createHabit(page: Page, opts: { name: string; days: number[]; color?: string }) {
  await page.goto("/habits");
  await page.getByText("+ Add habit").click();

  const form = page.getByTestId("add-habit-form");
  await form.locator('input[name="name"]').fill(opts.name);
  await setScheduledDays(form, opts.days);
  if (opts.color) await form.getByTestId(`color-${opts.color}`).click();

  await form.getByRole("button", { name: "Add habit" }).click();
  await expect(managedHabit(page, opts.name)).toBeVisible();

  const [row] = await sql<{ id: number }>("select id from habits where name = $1", [
    opts.name,
  ]);
  return row.id;
}

/** Seeds done-days directly; the UI can only ever toggle today. */
async function seedDays(habitId: number, dates: string[]) {
  for (const date of dates) {
    await sql(
      `insert into habit_logs (habit_id, date, done) values ($1, $2, true)
       on conflict (habit_id, date) do update set done = true`,
      [habitId, date],
    );
  }
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test.afterAll(async () => {
  await cleanup();
});

test("streak counts consecutive scheduled days, and an unchecked-but-due today does not break it", async ({
  page,
}) => {
  const name = uniq("streak");
  const id = await createHabit(page, { name, days: ALL_DAYS });

  // Three consecutive days ending YESTERDAY; today deliberately left unchecked.
  await seedDays(id, [istToday(-1), istToday(-2), istToday(-3)]);
  await page.reload();

  const row = habitRow(page, name);
  await expect(row).toHaveAttribute("data-done", "false");
  await expect(row).toHaveAttribute("data-streak", "3"); // not broken by today

  // Checking today extends it live, without a reload.
  await row.click();
  await expect(row).toHaveAttribute("data-done", "true");
  await expect(row).toHaveAttribute("data-streak", "4");

  await page.reload();
  await expect(habitRow(page, name)).toHaveAttribute("data-streak", "4"); // persisted

  // Un-checking returns to yesterday's streak.
  await habitRow(page, name).click();
  await expect(habitRow(page, name)).toHaveAttribute("data-streak", "3");
});

test("a missed scheduled day in the past ends the streak", async ({ page }) => {
  const name = uniq("gap");
  const id = await createHabit(page, { name, days: ALL_DAYS });

  // Yesterday done, TWO days ago missing, then two older days.
  await seedDays(id, [istToday(-1), istToday(-3), istToday(-4)]);
  await page.reload();

  await expect(habitRow(page, name)).toHaveAttribute("data-streak", "1");

  // Filling the gap reconnects the whole run: 1 + 1 + 2 = 4.
  await seedDays(id, [istToday(-2)]);
  await page.reload();
  await expect(habitRow(page, name)).toHaveAttribute("data-streak", "4");
});

test("double-tap leaves exactly one row and does not lose a toggle", async ({ page }) => {
  const name = uniq("dbltap");
  const id = await createHabit(page, { name, days: ALL_DAYS });
  const day = istToday();

  await habitRow(page, name).dblclick();

  // Two flips: absent -> done -> not done. One row, never two.
  await expect
    .poll(async () => {
      const rows = await sql<{ done: boolean }>(
        "select done from habit_logs where habit_id = $1 and date = $2",
        [id, day],
      );
      return rows.map((r) => r.done);
    })
    .toEqual([false]);

  await page.reload();
  await expect(habitRow(page, name)).toHaveAttribute("data-done", "false");

  // And a third tap still flips cleanly rather than inserting a duplicate.
  await habitRow(page, name).click();
  await expect(habitRow(page, name)).toHaveAttribute("data-done", "true");

  const count = await sql<{ n: string }>(
    "select count(*) as n from habit_logs where habit_id = $1 and date = $2",
    [id, day],
  );
  expect(Number(count[0].n)).toBe(1);
});

test("a habit only appears on the check-off list on its scheduled weekdays", async ({ page }) => {
  const todayDay = isoWeekdayOf(istToday());
  const otherDays = ALL_DAYS.filter((d) => d !== todayDay);

  const notToday = uniq("not-today");
  await createHabit(page, { name: notToday, days: otherDays });

  const onToday = uniq("on-today");
  await createHabit(page, { name: onToday, days: [todayDay] });

  await page.goto("/habits");

  // Scheduled elsewhere this week: not on the check-off list, but still
  // visible (and toggleable) under Manage.
  await expect(habitRow(page, notToday)).toHaveCount(0);
  await expect(managedHabit(page, notToday)).toBeVisible();

  // Scheduled today: on the list, and checkable.
  const row = habitRow(page, onToday);
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("data-done", "false");
  await row.click();
  await expect(row).toHaveAttribute("data-done", "true");
  await expect(row).toHaveAttribute("data-streak", "1");

  // Editing the "not today" habit to add today's day brings it onto the list.
  await managedHabit(page, notToday).getByText("Edit").click();
  const editForm = managedHabit(page, notToday).locator("form");
  await dayToggle(editForm, todayDay).click();
  await editForm.getByRole("button", { name: "Save" }).click();

  await expect(habitRow(page, notToday)).toBeVisible();
  await page.reload();
  await expect(habitRow(page, notToday)).toBeVisible(); // persisted
});

test("archiving hides a habit from the check-off list but keeps its history", async ({
  page,
}) => {
  const name = uniq("archive");
  const id = await createHabit(page, { name, days: ALL_DAYS });
  await seedDays(id, [istToday(-1), istToday(-2)]);
  await page.reload();
  await expect(habitRow(page, name)).toHaveAttribute("data-streak", "2");

  await managedHabit(page, name).getByTestId("archive-habit").click();

  // Gone from the check-off list…
  await expect(habitRow(page, name)).toHaveCount(0);
  // …but the logs are untouched.
  const logs = await sql<{ n: string }>(
    "select count(*) as n from habit_logs where habit_id = $1",
    [id],
  );
  expect(Number(logs[0].n)).toBe(2);

  // Restoring brings the streak back intact. The archived list is a collapsed
  // <details>, so open it first.
  await page.getByText(/^Archived \(\d+\)$/).click();
  await managedHabit(page, name).getByTestId("unarchive-habit").click();
  await expect(habitRow(page, name)).toHaveAttribute("data-streak", "2");
});

test("a habit's chosen color persists and shows on both the check-off card and the managed row", async ({
  page,
}) => {
  const name = uniq("color");
  await createHabit(page, { name, days: ALL_DAYS, color: "violet" });

  await expect(managedHabit(page, name)).toHaveAttribute("data-color", "violet");
  await expect(habitRow(page, name)).toHaveAttribute("data-color", "violet");

  await page.reload();
  await expect(managedHabit(page, name)).toHaveAttribute("data-color", "violet"); // persisted

  // Changing it in the edit form updates both surfaces.
  await managedHabit(page, name).getByText("Edit").click();
  const editForm = managedHabit(page, name).locator("form");
  await editForm.getByTestId("color-teal").click();
  await editForm.getByRole("button", { name: "Save" }).click();

  await expect(managedHabit(page, name)).toHaveAttribute("data-color", "teal");
  await expect(habitRow(page, name)).toHaveAttribute("data-color", "teal");
});
