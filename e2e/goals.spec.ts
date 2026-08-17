import { expect, test, type Locator, type Page } from "@playwright/test";
import { sql } from "./db";

/**
 * End-to-end checks for Goals (and the Roadmaps screen it reads from) against
 * the live Docker stack.
 *
 * The load-bearing test is `roadmap-linked goal shows exactly the Roadmaps page
 * number` — both screens must resolve their % through the one shared query
 * path, so if they ever drift apart this fails.
 *
 * Every test creates and deletes its own data, and any test that changes a
 * seeded topic puts it back, so the suite is safe to re-run.
 */

const PASSWORD = process.env.APP_PASSWORD ?? "change-me-now";

const uniq = (label: string) =>
  `E2E ${label} ${Math.random().toString(36).slice(2, 8)}`;

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.waitForURL("**/");
}

const goalCard = (page: Page, title: string) =>
  page.locator(`[data-testid="goal-card"][data-title="${title}"]`);

const goalPercent = (page: Page, title: string) =>
  goalCard(page, title).getByTestId("goal-percent");

async function createGoal(
  page: Page,
  opts: {
    title: string;
    source: "manual" | "roadmap";
    roadmapName?: string;
    milestones?: string[];
    targetDate?: string;
    category?: string;
    term?: "short" | "long";
  },
) {
  await page.goto("/goals");
  await page.getByText("+ Add goal").click();

  const form = page.getByTestId("add-goal-form");
  await form.locator('input[name="title"]').fill(opts.title);
  await form.locator('input[name="category"]').fill(opts.category ?? "General");
  await form.locator('select[name="term"]').selectOption(opts.term ?? "short");

  if (opts.targetDate) await form.locator('input[name="targetDate"]').fill(opts.targetDate);

  if (opts.source === "roadmap") {
    await form.getByText("Track a roadmap").click();
    await form.locator('select[name="roadmapId"]').selectOption({ label: opts.roadmapName! });
  } else if (opts.milestones?.length) {
    await form.locator('textarea[name="milestones"]').fill(opts.milestones.join("\n"));
  }

  await form.getByRole("button", { name: "Create goal" }).click();
  await expect(goalCard(page, opts.title)).toBeVisible();
}

/** `exact` matters: "Delete" would otherwise also match "Delete milestone X". */
async function removeGoal(page: Page, title: string) {
  await page.goto("/goals");
  const card = goalCard(page, title);
  if ((await card.count()) === 0) return;
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(card).toHaveCount(0);
}

const milestoneToggle = (page: Page, title: string, name: string) =>
  goalCard(page, title).getByRole("button", { name, exact: true });

/**
 * Click a topic until it reaches `target`. Never assumes a starting state, so
 * the suite is safe to re-run and safe against a half-finished earlier run.
 */
async function cycleTo(topic: Locator, target: string) {
  for (let i = 0; i < 3; i++) {
    const current = await topic.getAttribute("data-status");
    if (current === target) return;
    await topic.click();
    await expect
      .poll(async () => topic.getAttribute("data-status"))
      .not.toBe(current);
  }
  await expect(topic).toHaveAttribute("data-status", target);
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("roadmap-linked goal shows exactly the Roadmaps page number", async ({ page }) => {
  await page.goto("/roadmaps");
  const roadmapPct = (await page.getByTestId("roadmap-percent").innerText()).trim();
  const counts = (await page.getByTestId("roadmap-counts").innerText()).trim();
  const [done, total] = counts.match(/\d+/g)!.map(Number);

  const title = uniq("linked");
  await createGoal(page, { title, source: "roadmap", roadmapName: "Frontend" });

  await expect(goalPercent(page, title)).toHaveText(roadmapPct);
  await expect(goalCard(page, title)).toHaveAttribute("data-kind", "roadmap");
  await expect(goalCard(page, title)).toContainText(`${done}/${total} topics`);

  await removeGoal(page, title);
});

test("ticking a Frontend topic moves the linked goal, and they stay equal", async ({ page }) => {
  const topic = page.locator(
    '[data-testid="topic-row"][data-title="What is HTTP?"]',
  );

  // Normalise first — don't assume how a previous run left this topic.
  await page.goto("/roadmaps");
  await cycleTo(topic, "not_started");

  const title = uniq("tracks");
  await createGoal(page, { title, source: "roadmap", roadmapName: "Frontend" });
  const before = (await goalPercent(page, title).innerText()).trim();

  // not_started -> learning: counts as NOT done, so the number must not move.
  await page.goto("/roadmaps");
  await topic.click();
  await expect(topic).toHaveAttribute("data-status", "learning");
  await page.goto("/goals");
  await expect(goalPercent(page, title)).toHaveText(before);

  // learning -> done: now it should move, and match the roadmap.
  await page.goto("/roadmaps");
  await topic.click();
  await expect(topic).toHaveAttribute("data-status", "done");
  const roadmapAfter = (await page.getByTestId("roadmap-percent").innerText()).trim();

  await page.goto("/goals");
  const goalAfter = (await goalPercent(page, title).innerText()).trim();
  expect(goalAfter).toBe(roadmapAfter);
  expect(goalAfter).not.toBe(before);

  // done -> not_started: restore the seeded state.
  await page.goto("/roadmaps");
  await topic.click();
  await expect(topic).toHaveAttribute("data-status", "not_started");
  await page.goto("/goals");
  await expect(goalPercent(page, title)).toHaveText(before);

  await removeGoal(page, title);
});

test("manual goal with milestones tracks milestone completion", async ({ page }) => {
  const title = uniq("milestones");
  await createGoal(page, {
    title,
    source: "manual",
    milestones: ["alpha", "bravo", "charlie", "delta"],
  });

  await expect(goalCard(page, title)).toHaveAttribute("data-kind", "milestones");
  await expect(goalPercent(page, title)).toHaveText("0%");
  await expect(goalCard(page, title)).toContainText("0/4 milestones");

  // Milestones win over the slider, so no slider is offered.
  await expect(goalCard(page, title).locator('input[type="range"]')).toHaveCount(0);

  await milestoneToggle(page, title, "bravo").click();
  await expect(goalPercent(page, title)).toHaveText("25%");

  await page.reload();
  await expect(goalPercent(page, title)).toHaveText("25%"); // persisted

  await milestoneToggle(page, title, "alpha").click();
  await expect(goalPercent(page, title)).toHaveText("50%");

  // 100% must NOT auto-complete the goal.
  await milestoneToggle(page, title, "charlie").click();
  await milestoneToggle(page, title, "delta").click();
  await expect(goalPercent(page, title)).toHaveText("100%");

  await page.reload();
  await expect(goalCard(page, title)).toHaveAttribute("data-status", "active");
  await expect(goalCard(page, title)).toContainText("ready to complete?");

  await removeGoal(page, title);
});

test("manual goal without milestones is driven by the slider", async ({ page }) => {
  const title = uniq("slider");
  await createGoal(page, { title, source: "manual" });

  await expect(goalCard(page, title)).toHaveAttribute("data-kind", "manual");
  await expect(goalPercent(page, title)).toHaveText("0%");

  const slider = goalCard(page, title).locator('input[type="range"]');
  await slider.fill("70");
  await slider.dispatchEvent("pointerup");
  await expect(goalPercent(page, title)).toHaveText("70%");

  await page.reload();
  await expect(goalPercent(page, title)).toHaveText("70%"); // persisted

  await removeGoal(page, title);
});

test("overdue highlights only past-dated active goals", async ({ page }) => {
  const overdue = uniq("overdue");
  const future = uniq("future");

  await createGoal(page, { title: overdue, source: "manual", targetDate: "2020-01-01" });
  await createGoal(page, { title: future, source: "manual", targetDate: "2099-01-01" });

  await expect(goalCard(page, overdue)).toHaveAttribute("data-overdue", "true");
  await expect(goalCard(page, overdue)).toContainText("Overdue");
  await expect(goalCard(page, future)).toHaveAttribute("data-overdue", "false");
  await expect(goalCard(page, future)).not.toContainText("Overdue");

  // Completing it must clear the overdue state.
  await goalCard(page, overdue).getByRole("button", { name: "Mark done" }).click();
  await expect(goalCard(page, overdue)).toHaveAttribute("data-overdue", "false");

  await removeGoal(page, overdue);
  await removeGoal(page, future);
});

test("mark done and dropped persist", async ({ page }) => {
  const title = uniq("status");
  await createGoal(page, { title, source: "manual" });

  await goalCard(page, title).getByRole("button", { name: "Mark done" }).click();
  await expect(goalCard(page, title)).toHaveAttribute("data-status", "done");
  await page.reload();
  await expect(goalCard(page, title)).toHaveAttribute("data-status", "done");

  await goalCard(page, title).getByRole("button", { name: "Drop" }).click();
  await expect(goalCard(page, title)).toHaveAttribute("data-status", "dropped");
  await page.reload();
  await expect(goalCard(page, title)).toHaveAttribute("data-status", "dropped");

  await goalCard(page, title).getByRole("button", { name: "Reactivate" }).click();
  await expect(goalCard(page, title)).toHaveAttribute("data-status", "active");

  await removeGoal(page, title);
});

test("deleting a roadmap leaves its goal alive and manual", async ({ page }) => {
  const roadmapName = uniq("Throwaway");
  const title = uniq("orphan");

  await page.goto("/roadmaps");
  await page.getByText("+ Add roadmap").click();
  const form = page.getByTestId("add-roadmap-form");
  await form.locator('input[name="name"]').fill(roadmapName);
  await form.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("link", { name: roadmapName })).toBeVisible();

  await createGoal(page, { title, source: "roadmap", roadmapName });
  await expect(goalCard(page, title)).toHaveAttribute("data-kind", "roadmap");

  await page.goto("/roadmaps");
  await page.getByRole("link", { name: roadmapName }).click();
  await page.getByTestId("delete-roadmap").click();
  await page.getByTestId("delete-roadmap-confirm").click();
  await expect(page.getByRole("link", { name: roadmapName })).toHaveCount(0);

  // The goal survives, falling back to manual per the ON DELETE SET NULL FK.
  await page.goto("/goals");
  await expect(goalCard(page, title)).toBeVisible();
  await expect(goalCard(page, title)).toHaveAttribute("data-kind", "manual");
  await expect(goalCard(page, title)).toContainText("roadmap deleted");

  await removeGoal(page, title);
});

test("a long-term goal in a custom category displays and filters correctly", async ({ page }) => {
  const category = uniq("Category");
  const otherCategory = uniq("Other");
  const longTitle = uniq("longterm");
  const shortTitle = uniq("shortterm");

  await createGoal(page, { title: longTitle, source: "manual", category, term: "long" });
  await createGoal(page, { title: shortTitle, source: "manual", category: otherCategory, term: "short" });

  const longCard = goalCard(page, longTitle);
  await expect(longCard).toHaveAttribute("data-term", "long");
  await expect(longCard).toContainText(category);

  // Filtering to the long-term goal's category isolates it from the other one.
  await page.goto("/goals");
  await page.getByTestId("filter-category").locator(`[data-value="${category}"]`).click();
  await expect(goalCard(page, longTitle)).toBeVisible();
  await expect(goalCard(page, shortTitle)).toHaveCount(0);

  // Clearing the filter brings both back.
  await page.getByTestId("filter-category").locator('[data-value="all"]').click();
  await expect(goalCard(page, longTitle)).toBeVisible();
  await expect(goalCard(page, shortTitle)).toBeVisible();

  await removeGoal(page, longTitle);
  await removeGoal(page, shortTitle);
});

test("deleting a goal removes it and cascades its milestones for good", async ({ page }) => {
  const title = uniq("deleteme");

  await createGoal(page, {
    title,
    source: "manual",
    milestones: ["Step one", "Step two"],
  });

  const card = goalCard(page, title);
  await expect(card).toContainText("Step one");

  const [{ id }] = await sql<{ id: number }>("select id from goals where title = $1", [title]);
  const [{ count: milestonesBefore }] = await sql<{ count: number }>(
    "select count(*)::int from goal_milestones where goal_id = $1",
    [id],
  );
  expect(milestonesBefore).toBe(2);

  // "Delete" (exact) is the goal-level action — distinct from the
  // per-milestone "Delete milestone …" buttons rendered inside the same card.
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(card).toHaveCount(0);

  await page.reload();
  await expect(goalCard(page, title)).toHaveCount(0); // gone for good, not just optimistic

  const [{ count: goalsAfter }] = await sql<{ count: number }>(
    "select count(*)::int from goals where id = $1",
    [id],
  );
  const [{ count: milestonesAfter }] = await sql<{ count: number }>(
    "select count(*)::int from goal_milestones where goal_id = $1",
    [id],
  );
  expect(goalsAfter).toBe(0);
  expect(milestonesAfter).toBe(0); // cascaded, not orphaned
});
