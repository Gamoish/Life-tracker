import { expect, test, type Page } from "@playwright/test";

/**
 * Mobile nav cleanup: the notification bell moved out of the bottom bar into
 * a fixed top-right header, and the bottom bar itself shrank from 7
 * destinations (+ two utility icons) down to 4 icon-only primary tabs plus a
 * "More" sheet for the rest. Run at a phone-sized viewport since both
 * `MobileTopBar` and the reduced `BottomNav` are `md:hidden`.
 */

const PASSWORD = process.env.APP_PASSWORD ?? "change-me-now";

test.use({ viewport: { width: 390, height: 844 } });

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.waitForURL("**/");
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("the bottom bar shows exactly the primary four plus More, icon-only, and the bell lives in the top bar instead", async ({
  page,
}) => {
  const bottomNav = page.locator('nav[aria-label="Primary"]:visible');
  await expect(bottomNav).toBeVisible();

  // Icon-only: no visible text labels for the primary destinations.
  await expect(bottomNav).not.toContainText("Home");
  await expect(bottomNav).not.toContainText("Tasks");
  await expect(bottomNav).not.toContainText("Habits");
  await expect(bottomNav).not.toContainText("Expenses");

  await expect(bottomNav.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(bottomNav.getByRole("link", { name: "Tasks" })).toBeVisible();
  await expect(bottomNav.getByRole("link", { name: "Habits" })).toBeVisible();
  await expect(bottomNav.getByRole("link", { name: "Expenses" })).toBeVisible();
  await expect(bottomNav.getByTestId("more-menu-trigger")).toBeVisible();

  // Nothing else — Roadmaps/Goals/Health/Settings are not primary tabs anymore.
  await expect(bottomNav.getByRole("link", { name: "Roadmaps" })).toHaveCount(0);
  await expect(bottomNav.getByRole("link", { name: "Goals" })).toHaveCount(0);
  await expect(bottomNav.getByRole("link", { name: "Health" })).toHaveCount(0);
  await expect(bottomNav.getByLabel("Settings")).toHaveCount(0);

  // The bell is NOT in the bottom bar — it's in a fixed top-right header instead.
  await expect(bottomNav.getByTestId("task-bell")).toHaveCount(0);
  const topBell = page.locator('header [data-testid="task-bell"]:visible');
  await expect(topBell).toBeVisible();
  const box = await topBell.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeLessThan(80); // pinned near the very top of the viewport
});

test("the More menu opens and links to everything not in the primary tier", async ({ page }) => {
  const bottomNav = page.locator('nav[aria-label="Primary"]:visible');
  await bottomNav.getByTestId("more-menu-trigger").click();

  const panel = page.getByTestId("more-menu-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link", { name: "Health" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "Goals" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "Roadmaps" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "Journal" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "Settings" })).toBeVisible();

  await panel.getByRole("link", { name: "Journal" }).click();
  await page.waitForURL("**/journal");
  await expect(page.getByTestId("more-menu-panel")).toHaveCount(0);
});

test("tapping the bell still opens the due/overdue panel, now anchored below the top bar", async ({ page }) => {
  const topBell = page.locator('header [data-testid="task-bell"]:visible');
  await topBell.click();
  await expect(page.getByTestId("task-bell-panel")).toBeVisible();
});
