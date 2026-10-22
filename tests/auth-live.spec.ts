import { test, expect } from "@playwright/test";
import { initialState } from "../src/lib/demo";

test("ratings table combines filters and clears them on mobile", async ({ page }) => {
  await page.goto("/demo/dashboard/ratings");
  const table = page.getByRole("table", { name: "Ratings and reviews" });
  await expect(table).toBeVisible();
  const allRows = await table.locator("tbody tr").count();
  expect(allRows).toBeGreaterThan(0);
  await page.getByRole("combobox", { name: "Employee", exact: true }).selectOption("thabo");
  await page.getByRole("combobox", { name: "Written review", exact: true }).selectOption("yes");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator("tbody tr")).toContainText("Thabo Molefe");
  await page.getByRole("combobox", { name: "Star rating", exact: true }).selectOption("1");
  await expect(page.getByText("No ratings match your filters.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(table.locator("tbody tr")).toHaveCount(allRows);
  await page.getByLabel("Search reviews").fill("great recommendations");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.getByLabel("From date").fill(tomorrow);
  await expect(table.locator("tbody tr")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("public demo dashboard stays isolated from restaurant APIs", async ({ page }) => {
  const workspaceRequests: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/workspace")) workspaceRequests.push(request.url()); });
  await page.goto("/demo/dashboard");
  await expect(page.getByText("Demo workspace", { exact: false }).first()).toBeVisible();
  await page.locator(".sidebar nav").getByRole("link", { name: "Employees" }).click();
  await expect(page).toHaveURL(/\/demo\/dashboard\/employees$/);
  await expect(page.getByText("Sarah Jacobs").first()).toBeVisible();
  await page.goto("/demo/t/GT-001");
  await page.getByRole("button", { name: /Continue with/ }).click();
  await expect(page).toHaveURL(/\/demo\/payment\/demo-/);
  await page.getByRole("button", { name: "Simulate successful payment" }).click();
  await page.getByRole("button", { name: "5 stars", exact: true }).click();
  await page.getByLabel("Add a written review (optional)").fill("Warm welcome and wonderful service.");
  await page.getByRole("button", { name: "Send appreciation" }).click();
  await page.getByRole("link", { name: /View restaurant records/ }).click();
  await expect(page).toHaveURL(/\/demo\/dashboard\/tips$/);
  await page.locator(".sidebar nav").getByRole("link", { name: "Ratings", exact: true }).click();
  await expect(page.getByText("Warm welcome and wonderful service.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Warm welcome and wonderful service.")).toBeVisible();
  expect(workspaceRequests).toEqual([]);
});

test("connected public profile uses browser-only simulated payment and rating", async ({ page }) => {
  const workspaceRequests: string[] = [];
  page.on("request", request => { if (request.url().includes("/api/workspace")) workspaceRequests.push(request.url()); });
  await page.route("**/api/public/profile?*", route => route.fulfill({ json: { state: initialState(), version: 0 } }));
  await page.goto("/r/the-green-table/sarah");
  await page.getByRole("button", { name: /Continue with/ }).click();
  await expect(page).toHaveURL(/\/simulation\/payment\/demo-/);
  await page.getByRole("button", { name: "Simulate successful payment" }).click();
  await page.getByRole("button", { name: "4 stars", exact: true }).click();
  await page.getByLabel("Add a written review (optional)").fill("Thoughtful service and excellent recommendations.");
  await page.getByRole("button", { name: "Send appreciation" }).click();
  await page.reload();
  await expect(page.getByText("4 / 5 · Thank you for your appreciation.")).toBeVisible();
  await expect(page.getByText("Thoughtful service and excellent recommendations.")).toBeVisible();
  await expect(page.getByText("Simulation only. Tips and ratings are not saved to restaurant records.")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("tipit-simulated-reviews:the-green-table")!).tips[0].review))
    .toBe("Thoughtful service and excellent recommendations.");
  await page.getByRole("link", { name: "Back to employee" }).click();
  await page.getByRole("button", { name: /Continue with/ }).click();
  await page.getByRole("button", { name: "Simulate successful payment" }).click();
  await page.getByRole("button", { name: "5 stars", exact: true }).click();
  await page.getByRole("button", { name: "Send appreciation" }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("tipit-simulated-reviews:the-green-table")!).tips);
  expect(saved).toHaveLength(2);
  expect(saved[1].review).toBe("Thoughtful service and excellent recommendations.");
  expect(workspaceRequests).toEqual([]);
});
// Read-only checks against the selected development application. These tests
// never create accounts or submit credentials.
test("real Clerk sign-in and sign-up render, with visible navigation controls", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /^Get started/ })).toBeVisible();
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".cl-signIn-root")).toBeVisible({ timeout: 30000 });
  await expect(page.locator('input[name="identifier"]')).toBeVisible();
  await page.screenshot({
    path: "test-results/clerk-sign-in.png",
    fullPage: true,
  });
  await page.goto("/sign-up");
  await expect(page.locator(".cl-signUp-root")).toBeVisible({ timeout: 30000 });
});
test("signed-out visitors are redirected from private routes and can still tip", async ({
  page,
  request,
}) => {
  for (const path of [
    "/dashboard",
    "/dashboard/employees",
    "/account",
    "/onboarding",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in(?:[?#]|$)/, { timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "A little thanks, adding up." }),
    ).toHaveCount(0);
  }
  const configuration = await (await request.get("/api/integrations")).json();
  if (configuration.storage === "postgresql") {
    await page.goto("/t/UNKNOWN-PUBLIC-TAG");
    await expect(
      page.getByRole("heading", {
        name: "This tipping link is no longer active.",
      }),
    ).toBeVisible();
    return;
  }
  await page.goto("/t/GT-001");
  await expect(
    page.getByRole("heading", { name: "Say thanks to Sarah." }),
  ).toBeVisible();
  await page.goto("/r/the-green-table/sarah");
  await expect(
    page.getByRole("heading", { name: "Say thanks to Sarah." }),
  ).toBeVisible();
});
test("persistent workspace API requires authentication while checkout stays simulated", async ({
  request,
}) => {
  const configuration = await (await request.get("/api/integrations")).json();
  test.skip(
    configuration.storage !== "postgresql",
    "Requires persistent storage configuration",
  );
  expect(
    (
      await request.get("/api/workspace", {
        headers: { "X-Tipit-Organization": "org_forged" },
      })
    ).status(),
  ).toBe(401);
  const response = await request.post("/api/checkout", {
    data: { employeeId: "sample", amount: 5000 },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ mode: "demo" });
});
test("public staff directory is removed while individual tipping stays available", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Meet the team" })).toHaveCount(
    0,
  );
  const response = await page.goto("/r/the-green-table");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "This page isn’t available." }),
  ).toBeVisible();
});
