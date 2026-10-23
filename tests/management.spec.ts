import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { compareEmployees } from "../src/lib/comparisons";
import { operationAlerts } from "../src/lib/operations";
import { moderationSchema } from "../src/lib/moderation";
import { initialState } from "../src/lib/demo";

test("review text can be flagged, hidden and restored without changing its rating", async ({
  page,
}) => {
  await page.goto("/demo/dashboard/ratings");
  const row = page
    .getByRole("table", { name: "Ratings and reviews" })
    .locator("tbody tr")
    .filter({ has: page.getByRole("button", { name: /^Moderate review/ }) })
    .first();
  const stars = await row.locator(".review-stars").getAttribute("aria-label");
  const original = await row.locator("td.review-text").innerText();
  await row.getByRole("button", { name: /^Moderate review/ }).click();
  await page
    .getByLabel("Moderation reason", { exact: true })
    .fill("Contains private personal details");
  await page
    .getByRole("button", { name: "Save moderation", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Moderation action", exact: true })
    .selectOption("hide");
  await page
    .getByLabel("Moderation reason", { exact: true })
    .fill("Owner reviewed and hid personal details");
  await page
    .getByRole("button", { name: "Save moderation", exact: true })
    .click();
  await expect(row.locator("td.review-text")).toContainText(
    "Review text hidden",
  );
  await expect(row.locator(".review-stars")).toHaveAttribute(
    "aria-label",
    stars!,
  );
  await page
    .getByRole("combobox", { name: "Moderation action", exact: true })
    .selectOption("restore");
  await page
    .getByLabel("Moderation reason", { exact: true })
    .fill("Owner verified the original content");
  await page
    .getByRole("button", { name: "Save moderation", exact: true })
    .click();
  await expect(row.locator("td.review-text")).toHaveText(original);
  await expect(page.locator(".moderation-history li")).toHaveCount(3);
  await page.reload();
  await expect(row.locator("td.review-text")).toHaveText(original);
});

test("bulk tags create and download valid QR files together, then suspend selected links", async ({
  page,
}) => {
  await page.goto("/demo/dashboard/tags");
  const bulk = page.getByRole("region", {
    name: "Bulk tag tools",
    exact: true,
  });
  await bulk
    .getByText("Create tags for multiple employees", { exact: true })
    .click();
  await bulk
    .getByRole("group", { name: "Employees for new tags" })
    .getByLabel("Sarah Jacobs")
    .check();
  await bulk.getByLabel("Tags per employee", { exact: true }).fill("2");
  await bulk
    .getByRole("button", { name: "Create tag batch", exact: true })
    .click();
  await expect(bulk.getByRole("status")).toContainText("2 tags created");
  const download = page.waitForEvent("download");
  await bulk
    .getByRole("button", { name: "Download selected QR codes", exact: true })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("tipit-qr-codes.zip");
  const entries = unzipSync(
    new Uint8Array(await readFile((await file.path())!)),
  );
  expect(Object.keys(entries)).toHaveLength(2);
  for (const [name, value] of Object.entries(entries)) {
    expect(name).toMatch(/^GT-.*\.svg$/);
    expect(strFromU8(value)).toContain("<svg");
  }
  await bulk
    .getByRole("button", { name: "Suspend selected tags", exact: true })
    .click();
  await expect(bulk.getByRole("status")).toContainText(
    "Selected tags suspended",
  );
  await bulk
    .getByRole("button", { name: "Download selected QR codes", exact: true })
    .click();
  await expect(bulk.getByRole("status")).toContainText("Select active tags");
});

test("comparison filters and exports work, while demo operational status remains explicit", async ({
  page,
  request,
}) => {
  await page.goto("/demo/dashboard/comparisons");
  await expect(
    page
      .getByRole("table", { name: "Employee comparison" })
      .locator("tbody tr"),
  ).toHaveCount(2);
  await page.getByLabel("Report from", { exact: true }).fill("2099-01-01");
  await page.getByLabel("Report until", { exact: true }).fill("2099-01-02");
  await expect(
    page
      .getByRole("table", { name: "Employee comparison" })
      .locator("tbody tr")
      .first(),
  ).toContainText("No ratings");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export comparison CSV", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "tipit-employee-comparison.csv",
  );
  await page.goto("/demo/dashboard/alerts");
  await expect(
    page.getByRole("heading", { name: "Payments are simulated", exact: true }),
  ).toBeVisible();
  expect((await request.get("/api/operations")).status()).toBe(401);
  expect((await request.get("/api/reviews/moderation")).status()).toBe(401);
  expect(
    (
      await request.post("/api/reviews/moderation", { data: { isOwner: true } })
    ).status(),
  ).toBe(401);
});

test("comparison calculations exclude provider tests and moderation accepts no rating edits", () => {
  const state = initialState();
  const employeeId = state.employees[0].id;
  state.tips = [
    {
      id: "paid",
      employeeId,
      amount: 10000,
      status: "paid",
      rating: 4,
      review: "Good service",
      createdAt: "2026-10-24T12:00:00Z",
    },
    {
      id: "test",
      employeeId,
      amount: 90000,
      status: "paid",
      rating: 1,
      review: "Test",
      processingMode: "test",
      createdAt: "2026-10-24T12:00:00Z",
    },
    {
      id: "prior",
      employeeId,
      amount: 5000,
      status: "paid",
      rating: 3,
      createdAt: "2026-10-23T12:00:00Z",
    },
  ];
  const result = compareEmployees(state, [employeeId], {
    from: "2026-10-24",
    until: "2026-10-24",
  })[0];
  expect(result.current).toMatchObject({
    net: 10000,
    average: 4,
    ratingCount: 1,
  });
  expect(result.previous).toMatchObject({ net: 5000, average: 3 });
  expect(result.writtenReviews).toBe(1);
  expect(
    moderationSchema.safeParse({
      requestId: crypto.randomUUID(),
      tipId: crypto.randomUUID(),
      action: "hide",
      reason: "Valid reason",
      rating: 5,
      isOwner: true,
    }).success,
  ).toBe(false);
  const alerts = operationAlerts({
    mode: "live",
    configured: false,
    credentialMatch: false,
    configurationError: false,
    lastWebhook: null,
    liveFailed: 2,
    testFailed: 1,
    livePending: 1,
    testPending: 0,
    checkedAt: new Date().toISOString(),
    sample: false,
  });
  expect(alerts.map((alert) => alert.id)).toEqual([
    "merchant",
    "Live-failed",
    "Live-pending",
    "Test-failed",
  ]);
  expect(alerts.find((alert) => alert.id === "Live-pending")?.detail).toContain(
    "does not prove webhook failure",
  );
});
