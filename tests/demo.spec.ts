import { test, expect } from "@playwright/test";
test("dashboard shell and section skeletons render before data is ready", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  const page = await context.newPage();
  for (const section of [
    "",
    "employees",
    "employees/sarah",
    "tips",
    "ratings",
    "tags",
    "hardware",
    "settings",
  ]) {
    await page.goto(`/dashboard${section ? `/${section}` : ""}`);
    await expect(page.locator(".sidebar")).toBeVisible();
    await expect(page.locator(".sidebar nav a")).toHaveCount(7);
    await expect(page.locator(".dashboard-top")).toBeVisible();
    await expect(page.locator("main.dashboard-content")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(
      page.getByRole("status", { name: "Loading dashboard content" }),
    ).toBeVisible();
    await expect(page.locator(".skeleton-bone").first()).toHaveCSS(
      "animation-name",
      "skeleton-pulse",
    );
    await expect(page.locator(".loading")).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".dashboard-skeleton")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await context.close();
});

test("guest tip becomes a confirmed restaurant transaction with one rating", async ({
  page,
}) => {
  await page.goto("/t/GT-001");
  await expect(
    page.getByRole("heading", { name: "Say thanks to Sarah." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "R100", exact: true }).click();
  await page.getByRole("button", { name: /Continue with/ }).click();
  await expect(
    page.getByRole("heading", { name: "Try the checkout experience." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate successful payment" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A little thanks, received." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "4 stars", exact: true }).click();
  await page.getByRole("button", { name: "Send appreciation" }).click();
  await expect(
    page.getByText("4 / 5 · Thank you for your appreciation."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("4 / 5 · Thank you for your appreciation."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send appreciation" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "View restaurant records" }).click();
  await expect(page.locator("tbody tr").first()).toContainText("Sarah Jacobs");
  await expect(page.locator("tbody tr").first()).toContainText("Confirmed");
});
test("archive suspends tags and preserves historical transactions", async ({
  page,
}) => {
  await page.goto("/dashboard/employees/sarah");
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Archive employee", exact: true })
    .click();
  await expect(page.getByText("Archived", { exact: true })).toBeVisible();
  await page.goto("/t/GT-001");
  await expect(
    page.getByRole("heading", {
      name: "This tipping link is no longer active.",
    }),
  ).toBeVisible();
  await page.goto("/dashboard/tips");
  await expect(page.locator("tbody")).toContainText("Sarah Jacobs");
  await page.goto("/dashboard/employees/sarah");
  await page.getByRole("button", { name: "Restore employee" }).click();
  await page.goto("/t/GT-001");
  await expect(
    page.getByRole("heading", {
      name: "This tipping link is no longer active.",
    }),
  ).toBeVisible();
});
test("employee creation, QR generation, hardware order and reset work", async ({
  page,
}) => {
  await page.goto("/dashboard/employees");
  await page.getByRole("button", { name: "+ Add team member" }).click();
  await page.getByLabel("Full name").fill("Lerato Ndlovu");
  await page.getByLabel("Role", { exact: true }).fill("Waiter");
  await page.getByRole("button", { name: "Add employee", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lerato Ndlovu" }),
  ).toBeVisible();
  await page.goto("/dashboard/tags");
  await page.getByLabel("Team member").selectOption({ label: "Lerato Ndlovu" });
  await page.getByRole("button", { name: "Create link" }).click();
  await expect(page.locator("tbody tr").last()).toContainText("Lerato Ndlovu");
  await page
    .locator("tbody tr")
    .last()
    .getByRole("button", { name: "QR", exact: true })
    .click();
  await expect(page.getByRole("link", { name: "Download QR" })).toBeVisible();
  await page.goto("/dashboard/hardware");
  await page.getByRole("button", { name: "Create demo order" }).first().click();
  await expect(page.locator(".order-row")).toContainText("Personal NFC card");
  await page.goto("/dashboard/settings");
  await page.getByRole("button", { name: "Demo controls" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await page.goto("/dashboard/employees");
  await expect(
    page.getByRole("heading", { name: "Lerato Ndlovu" }),
  ).toHaveCount(0);
});
test("checkout rejects invalid amounts; non-successful tips cannot be rated", async ({
  page,
  request,
}) => {
  const invalid = await request.post("/api/checkout", {
    data: { amount: -100, employeeId: "sarah" },
  });
  expect(invalid.status()).toBe(400);
  await page.goto("/t/GT-001");
  await page.getByRole("button", { name: /Continue with/ }).click();
  await page.getByRole("button", { name: "Simulate failed payment" }).click();
  await expect(
    page.getByRole("heading", { name: "Payment failed" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send appreciation" }),
  ).toHaveCount(0);
});
test("mobile landing and dashboard fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Great service/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/landing-mobile.png",
    fullPage: true,
  });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "A little thanks, adding up." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("link", { name: "Employees", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your people. Their appreciation." }),
  ).toBeVisible();
});
test("public and management pages load and desktop design renders", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Great service/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
  });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "A little thanks, adding up." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  for (const route of [
    "/pricing",
    "/how-it-works",
    "/sign-in",
    "/sign-up",
    "/onboarding",
    "/account",
    "/help",
    "/privacy",
    "/terms",
    "/dashboard/ratings",
    "/dashboard/settings",
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  }
  expect(errors).toEqual([]);
});
