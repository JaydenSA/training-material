import { test, expect } from "@playwright/test";
import { initialState } from "../src/lib/demo";

test("setup, employee insights and activity work together without sending invitations", async ({
  page,
  request,
}) => {
  await page.goto("/demo/dashboard");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/pilot-dashboard-desktop.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("region", { name: "Restaurant setup checklist" }),
  ).toContainText("3 of 4 setup steps complete");
  await page.goto("/demo/dashboard/employees/sarah");
  await expect(
    page.getByRole("table", { name: "Employee tips", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Employee reviews", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Employee tags", exact: true }),
  ).toContainText("GT-001");
  await page.getByLabel("Report from", { exact: true }).fill("2099-01-01");
  await expect(
    page
      .getByRole("table", { name: "Employee tips", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Reset report filters" }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Sarah Updated");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page.goto("/demo/dashboard/activity");
  await expect(
    page.getByRole("table", { name: "Activity history", exact: true }),
  ).toContainText("Updated employee");
  await expect(
    page.getByRole("table", { name: "Activity history", exact: true }),
  ).toContainText("Demo owner");
  await page.goto("/demo/dashboard/settings#team");
  await expect(
    page.getByRole("heading", { name: "Dashboard access preview" }),
  ).toBeVisible();
  await expect(
    page.getByText("Invitations are disabled in the public demo.", {
      exact: false,
    }),
  ).toBeVisible();
  expect((await request.get("/api/activity")).status()).toBe(401);
});

test("reports export employee summaries and compare periods", async ({
  page,
}) => {
  await page.goto("/demo/dashboard/reports");
  await expect(
    page
      .getByRole("table", { name: "Employee report", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(4);
  await page
    .getByRole("combobox", { name: "Report employee", exact: true })
    .selectOption("sarah");
  await expect(
    page
      .getByRole("table", { name: "Employee report", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(1);
  await page.getByLabel("Report from", { exact: true }).fill("2026-10-01");
  await page.getByLabel("Report until", { exact: true }).fill("2026-10-31");
  await expect(
    page.getByText("Previous net before fees:", { exact: false }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export employee summary" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "tipit-employee-summary.csv",
  );
});

test("print sheets exclude inactive tags and mobile navigation supports keyboard recovery", async ({
  page,
}) => {
  await page.goto("/demo/dashboard/print");
  await expect(
    page.getByRole("button", { name: "Print / Save as PDF" }),
  ).toBeEnabled();
  await expect(page.locator(".print-qr-card")).toHaveCount(3);
  await expect(page.locator(".print-sheet")).not.toContainText("GT-004");
  await page
    .getByRole("combobox", { name: "Print employee", exact: true })
    .selectOption("sarah");
  await expect(page.locator(".print-qr-card")).toHaveCount(1);
  await expect(page.locator(".print-sheet img")).toHaveAttribute(
    "src",
    /data:image\/svg\+xml/,
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".print-controls")).toBeHidden();
  await expect(page.locator(".print-sheet")).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Yoco receipt waits for server confirmation and submits a real review without simulation controls", async ({
  page,
}) => {
  const id = "ab7f4296-3377-4ef9-b753-96a635df2ace";
  let reads = 0;
  let submitted: unknown;
  const receipt = {
    id,
    amount: 5000,
    mode: "test",
    employeeName: "Test Waiter",
    restaurantName: "Test Restaurant",
    rating: null,
    review: null,
  };
  await page.route(`**/api/payments/${id}`, async (route) => {
    if (route.request().method() === "POST") {
      submitted = route.request().postDataJSON();
      return route.fulfill({
        json: {
          ...receipt,
          status: "paid",
          rating: 5,
          review: "Lovely service.",
        },
      });
    }
    return route.fulfill({
      json: { ...receipt, status: reads++ === 0 ? "pending" : "paid" },
    });
  });
  await page.goto(`/payment/${id}?success=true`);
  await expect(
    page.getByRole("heading", { name: "Waiting for payment confirmation." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simulate successful payment" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "A little thanks, received." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "5 stars", exact: true }).click();
  await page
    .getByLabel("Add a written review (optional)")
    .fill("Lovely service.");
  await page.getByRole("button", { name: "Send appreciation" }).click();
  await expect(page.getByText("Lovely service.")).toBeVisible();
  expect(submitted).toEqual({ rating: 5, review: "Lovely service." });
});

test("ratings table combines filters and clears them on mobile", async ({
  page,
}) => {
  await page.goto("/demo/dashboard/ratings");
  const table = page.getByRole("table", { name: "Ratings and reviews" });
  await expect(table).toBeVisible();
  const allRows = await table.locator("tbody tr").count();
  expect(allRows).toBeGreaterThan(0);
  await page
    .getByRole("combobox", { name: "Employee", exact: true })
    .selectOption("thabo");
  await page
    .getByRole("combobox", { name: "Written review", exact: true })
    .selectOption("yes");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator("tbody tr")).toContainText("Thabo Molefe");
  await page
    .getByRole("combobox", { name: "Star rating", exact: true })
    .selectOption("1");
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("public demo dashboard stays isolated from restaurant APIs", async ({
  page,
}) => {
  const workspaceRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/workspace"))
      workspaceRequests.push(request.url());
  });
  await page.goto("/demo/dashboard");
  await expect(
    page.getByText("Demo workspace", { exact: false }).first(),
  ).toBeVisible();
  await page
    .locator(".sidebar nav")
    .getByRole("link", { name: "Employees" })
    .click();
  await expect(page).toHaveURL(/\/demo\/dashboard\/employees$/);
  await expect(page.getByText("Sarah Jacobs").first()).toBeVisible();
  await page.goto("/demo/t/GT-001");
  await page.getByRole("button", { name: /Continue with/ }).click();
  await expect(page).toHaveURL(/\/demo\/payment\/demo-/);
  await page
    .getByRole("button", { name: "Simulate successful payment" })
    .click();
  await page.getByRole("button", { name: "5 stars", exact: true }).click();
  await page
    .getByLabel("Add a written review (optional)")
    .fill("Warm welcome and wonderful service.");
  await page.getByRole("button", { name: "Send appreciation" }).click();
  await page.getByRole("link", { name: /View restaurant records/ }).click();
  await expect(page).toHaveURL(/\/demo\/dashboard\/tips$/);
  await page
    .locator(".sidebar nav")
    .getByRole("link", { name: "Ratings", exact: true })
    .click();
  await expect(
    page.getByText("Warm welcome and wonderful service."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Warm welcome and wonderful service."),
  ).toBeVisible();
  expect(workspaceRequests).toEqual([]);
});

test("connected public profile uses browser-only simulated payment and rating", async ({
  page,
}) => {
  const workspaceRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/workspace"))
      workspaceRequests.push(request.url());
  });
  await page.route("**/api/public/profile?*", (route) =>
    route.fulfill({ json: { state: initialState(), version: 0 } }),
  );
  await page.goto("/r/the-green-table/sarah");
  await page.getByRole("button", { name: /Continue with/ }).click();
  await expect(page).toHaveURL(/\/simulation\/payment\/demo-/);
  await page
    .getByRole("button", { name: "Simulate successful payment" })
    .click();
  await page.getByRole("button", { name: "4 stars", exact: true }).click();
  await page
    .getByLabel("Add a written review (optional)")
    .fill("Thoughtful service and excellent recommendations.");
  await page.getByRole("button", { name: "Send appreciation" }).click();
  await page.reload();
  await expect(
    page.getByText("4 / 5 · Thank you for your appreciation."),
  ).toBeVisible();
  await expect(
    page.getByText("Thoughtful service and excellent recommendations."),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Simulation only. Tips and ratings are not saved to restaurant records.",
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("tipit-simulated-reviews:the-green-table")!,
        ).tips[0].review,
    ),
  ).toBe("Thoughtful service and excellent recommendations.");
  await page.getByRole("link", { name: "Back to employee" }).click();
  await page.getByRole("button", { name: /Continue with/ }).click();
  await page
    .getByRole("button", { name: "Simulate successful payment" })
    .click();
  await page.getByRole("button", { name: "5 stars", exact: true }).click();
  await page.getByRole("button", { name: "Send appreciation" }).click();
  const saved = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("tipit-simulated-reviews:the-green-table")!,
      ).tips,
  );
  expect(saved).toHaveLength(2);
  expect(saved[1].review).toBe(
    "Thoughtful service and excellent recommendations.",
  );
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
  await expect(
    page.getByRole("link", { name: "Explore demo", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Try onboarding demo", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/clerk-sign-in.png",
    fullPage: true,
  });
  await page.goto("/sign-up");
  await expect(page.locator(".cl-signUp-root")).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("link", { name: "Explore demo", exact: true }),
  ).toBeVisible();
  await page.goto("/demo/dashboard");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in(?:[?#]|$)/);
  await expect(page.locator(".cl-signIn-root")).toBeVisible();
  await page.goto("/demo/sign-up");
  await expect(page).toHaveURL(/\/sign-up(?:[?#]|$)/);
  await expect(page.locator(".cl-signUp-root")).toBeVisible();
});

test("new restaurant onboarding demo starts empty and never writes to connected storage", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/workspace")) writes.push(request.method());
  });
  await page.goto("/sign-up");
  await page
    .getByRole("link", { name: "Try onboarding demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Set up your restaurant demo." }),
  ).toBeVisible();
  await expect(page.getByLabel("Restaurant name", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByLabel("Restaurant name", { exact: true })
    .fill("First Table Demo");
  await page
    .getByLabel("Contact email", { exact: true })
    .fill("owner@example.com");
  await page.getByLabel("City", { exact: true }).fill("Durban");
  await page
    .getByRole("button", { name: "Create demo restaurant", exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo\/dashboard$/);
  await expect(page.locator(".workspace")).toContainText("First Table Demo");
  const snapshot = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tipit-demo-v1") || "{}"),
  );
  expect(snapshot).toMatchObject({
    restaurant: {
      name: "First Table Demo",
      email: "owner@example.com",
      city: "Durban",
    },
    employees: [],
    tags: [],
    tips: [],
    orders: [],
    onboarded: true,
  });
  await page.reload();
  await expect(page.locator(".workspace")).toContainText("First Table Demo");
  expect(writes).toEqual([]);
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
