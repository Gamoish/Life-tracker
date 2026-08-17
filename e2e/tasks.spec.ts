import { expect, test, type Locator, type Page } from "@playwright/test";
import { cleanup, istToday, sql } from "./db";

/**
 * Tasks, against the live stack.
 *
 * The exhaustive recurrence-math matrix (clamped day-of-month, leap-day
 * anchors, "overdue means the most recent occurrence was missed") is covered
 * by the isolation tests in src/lib/task-schedule.test.ts against a fixed
 * anchor date; this suite proves the DB + UI wiring around it — a task lands
 * on the tab its recurrence implies, checking it off persists as a log entry
 * rather than mutating the task, and the bell reflects what's due — without
 * re-deriving that matrix against the live clock.
 */

const PASSWORD = process.env.APP_PASSWORD ?? "change-me-now";
const uniq = (label: string) => `E2E ${label} ${Math.random().toString(36).slice(2, 8)}`;
type Tab = "daily" | "weekly" | "monthly" | "yearly";

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.waitForURL("**/");
}

const taskRow = (page: Page, title: string) =>
  page.locator(`[data-testid="task-row"][data-title="${title}"]`);

// The bell renders once in Sidebar (desktop) and once in MobileTopBar
// (mobile) — same "same data, two chrome-specific renderings" pattern
// DESTINATIONS uses. Both are in the DOM regardless of viewport, so scope to
// the one that's actually visible (Desktop Chrome, the test project's default).
const bellButton = (page: Page) => page.locator('[data-testid="task-bell"]:visible');

function dayToggle(scope: Locator, day: number) {
  return scope.locator(`label:has(input[data-testid="day-${day}"])`);
}

async function setTab(page: Page, tab: Tab) {
  await page.getByTestId("task-tabs").locator(`[data-value="${tab}"]`).click();
}

async function addTaskViaForm(
  page: Page,
  opts: {
    title: string;
    recurrence: "one_off" | "daily" | "weekly" | "monthly" | "yearly";
    dueDate: string;
    weekdays?: number[];
  },
) {
  await page.goto("/tasks");
  await page.getByText("+ Add task").click();

  const form = page.getByTestId("add-task-form");
  await form.locator('input[name="title"]').fill(opts.title);
  await form.locator('input[name="dueDate"]').fill(opts.dueDate);
  await form.locator('select[name="recurrence"]').selectOption(opts.recurrence);
  if (opts.recurrence === "weekly" && opts.weekdays) {
    // The picker defaults to all 7 days — untick everything not wanted.
    for (let day = 1; day <= 7; day++) {
      const checkbox = form.getByTestId(`day-${day}`);
      const checked = await checkbox.isChecked();
      const want = opts.weekdays.includes(day);
      if (checked !== want) await dayToggle(form, day).click();
    }
  }

  // No visibility assertion here: the page always lands on the Daily tab
  // after a fresh `/tasks` navigation, and a weekly/monthly/yearly task's row
  // won't exist in the DOM at all until the caller switches to its tab.
  await form.getByRole("button", { name: "Add task" }).click();
  await page.waitForLoadState("networkidle");
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test.afterAll(async () => {
  await cleanup();
  await sql("delete from tasks where title like 'E2E %'");
});

test("a one-off task due today appears on the Daily tab and can be checked off", async ({ page }) => {
  const title = uniq("oneoff");
  await addTaskViaForm(page, { title, recurrence: "one_off", dueDate: istToday() });

  await setTab(page, "daily");
  const row = taskRow(page, title);
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("data-done", "false");

  await row.locator("button[aria-pressed]").click();
  await expect(row).toHaveAttribute("data-done", "true");

  await page.reload();
  await setTab(page, "daily");
  await expect(taskRow(page, title)).toHaveAttribute("data-done", "true"); // persisted

  // Un-check leaves it not-deleted, just pending again.
  await taskRow(page, title).locator("button[aria-pressed]").click();
  await expect(taskRow(page, title)).toHaveAttribute("data-done", "false");
});

test("a daily task appears on the Daily tab, and completing it logs today without moving the task", async ({
  page,
}) => {
  const title = uniq("daily");
  await addTaskViaForm(page, { title, recurrence: "daily", dueDate: istToday(-1) });

  await setTab(page, "daily");
  const row = taskRow(page, title);
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("data-done", "false");

  const [{ id }] = await sql<{ id: number }>("select id from tasks where title = $1", [title]);

  await row.locator("button[aria-pressed]").click();
  await expect(row).toHaveAttribute("data-done", "true");

  // "Rolling forward" means nothing is mutated on the task row — a
  // completion log entry for TODAY is all that exists; the task recurs again
  // tomorrow because the recurrence rule itself never changes.
  // Cast to text in the query itself: `pg`'s default DATE parser builds the
  // JS Date from LOCAL year/month/day, not UTC, so on a host whose local
  // timezone isn't UTC, `.toISOString()` silently shifts the calendar day.
  // Casting sidesteps that gotcha entirely instead of fighting Date semantics.
  const completions = await sql<{ date: string; done: boolean }>(
    "select date::text as date, done from task_completions where task_id = $1",
    [id],
  );
  expect(completions).toHaveLength(1);
  expect(completions[0].date).toBe(istToday());
  expect(completions[0].done).toBe(true);

  const [unchanged] = await sql<{ due_date: string }>(
    "select due_date::text as due_date from tasks where id = $1",
    [id],
  );
  expect(unchanged.due_date).toBe(istToday(-1)); // anchor never moves
});

test("a weekly task lands on the Weekly tab regardless of which days it's scheduled", async ({ page }) => {
  const title = uniq("weekly");
  await addTaskViaForm(page, {
    title,
    recurrence: "weekly",
    dueDate: istToday(-14),
    weekdays: [1, 2, 3, 4, 5, 6, 7],
  });

  await setTab(page, "weekly");
  await expect(taskRow(page, title)).toBeVisible();
  await expect(taskRow(page, title)).toHaveAttribute("data-recurrence", "weekly");
});

test("a monthly task lands on the Monthly tab", async ({ page }) => {
  const title = uniq("monthly");
  await addTaskViaForm(page, { title, recurrence: "monthly", dueDate: istToday() });

  await setTab(page, "monthly");
  await expect(taskRow(page, title)).toBeVisible();
  await expect(taskRow(page, title)).toHaveAttribute("data-recurrence", "monthly");
});

test("a yearly task lands on the Yearly tab", async ({ page }) => {
  const title = uniq("yearly");
  await addTaskViaForm(page, { title, recurrence: "yearly", dueDate: istToday() });

  await setTab(page, "yearly");
  await expect(taskRow(page, title)).toBeVisible();
  await expect(taskRow(page, title)).toHaveAttribute("data-recurrence", "yearly");
});

test("the nav bell surfaces an overdue task, and it drops off once it's done", async ({ page }) => {
  const title = uniq("overdue");
  // Seeded directly: the UI can only ever create a task due today or later.
  await sql("insert into tasks (title, recurrence, due_date) values ($1, 'one_off', $2)", [
    title,
    istToday(-2),
  ]);

  await page.goto("/");
  await bellButton(page).click();
  const panel = page.getByTestId("task-bell-panel");
  await expect(panel).toContainText(title);

  // Find it via the Yearly tab — a one-off due a couple of days ago is
  // reliably still "this year" (Weekly/Monthly aren't: a task from a few
  // days back can fall into last week or last month depending what day of
  // the week/month "today" happens to be).
  await page.goto("/tasks");
  await page.getByTestId("task-tabs").locator('[data-value="yearly"]').click();
  const row = page.locator(`[data-testid="task-row"][data-title="${title}"]`);
  await expect(row).toHaveAttribute("data-overdue", "true");

  await row.locator("button[aria-pressed]").click();
  await expect(row).toHaveAttribute("data-done", "true");

  await page.goto("/");
  await bellButton(page).click();
  await expect(page.getByTestId("task-bell-panel")).not.toContainText(title);
});
