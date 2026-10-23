import { test, expect } from "@playwright/test";
import { hasTestingAccess, TESTING_EMAIL } from "../src/lib/testing/access";
import { commandSchema, mutationSchema } from "../src/lib/workspace-contract";
import { demoActivity } from "../src/lib/activity";
import { initialState } from "../src/lib/demo";
import { parseTestReport } from "../src/lib/testing/report";

test("test reports never label empty, failed, interrupted or skipped suites as passing", () => {
  const report = (status: string) =>
    JSON.stringify({
      suites: [
        {
          title: "feature",
          specs: [
            {
              title: "workflow",
              tests: [
                {
                  expectedStatus: "passed",
                  results: [{ status, duration: 45 }],
                },
              ],
            },
          ],
        },
      ],
    });
  expect(parseTestReport(report("passed"), false)).toMatchObject({
    status: "passed",
    tests: [{ name: "feature / workflow", status: "passed", duration: 45 }],
  });
  for (const status of ["failed", "timedOut", "interrupted", "skipped"])
    expect(parseTestReport(report(status), false).status).toBe("failed");
  expect(parseTestReport(report("passed"), true).status).toBe("failed");
  expect(parseTestReport('{"suites":[]}', false).status).toBe("failed");
  expect(() => parseTestReport("not JSON", false)).toThrow();
});

test("only the verified primary email on the superuser allowlist grants testing access", () => {
  const user = {
    primaryEmailAddressId: "primary",
    emailAddresses: [
      {
        id: "primary",
        emailAddress: TESTING_EMAIL,
        verification: { status: "verified" },
      },
    ],
  };
  expect(hasTestingAccess(user)).toBe(true);
  expect(
    hasTestingAccess({
      ...user,
      emailAddresses: [
        {
          ...user.emailAddresses[0],
          emailAddress: TESTING_EMAIL.toUpperCase(),
        },
      ],
    }),
  ).toBe(true);
  expect(hasTestingAccess(null)).toBe(false);
  expect(hasTestingAccess(undefined)).toBe(false);
  expect(
    hasTestingAccess({ ...user, primaryEmailAddressId: "different" }),
  ).toBe(false);
  expect(
    hasTestingAccess({
      ...user,
      emailAddresses: [
        { ...user.emailAddresses[0], verification: { status: "unverified" } },
      ],
    }),
  ).toBe(false);
  expect(
    hasTestingAccess({
      ...user,
      emailAddresses: [{ ...user.emailAddresses[0], verification: null }],
    }),
  ).toBe(false);
  expect(
    hasTestingAccess({
      ...user,
      emailAddresses: [
        { ...user.emailAddresses[0], emailAddress: "manager@example.com" },
      ],
    }),
  ).toBe(false);
  expect(
    hasTestingAccess({
      ...user,
      emailAddresses: [
        { ...user.emailAddresses[0], emailAddress: ` ${TESTING_EMAIL}` },
      ],
    }),
  ).toBe(false);
});

test("testing page and execution API stay private, including the demo prefix", async ({
  page,
  request,
}) => {
  const access = await request.get("/api/testing/access");
  expect(await access.json()).toEqual({ allowed: false });
  for (const method of ["get", "post"] as const) {
    const response = await request[method]("/api/testing");
    expect(response.status()).toBe(403);
    expect(await response.json()).toMatchObject({ code: "testing_forbidden" });
  }
  const demo = await page.goto("/demo/dashboard/testing");
  expect(demo?.status()).toBe(404);
  const real = await page.goto("/dashboard/testing");
  expect(real?.status() === 404 || page.url().includes("/sign-in")).toBe(true);
  await page.goto("/demo/dashboard");
  await expect(
    page.getByRole("link", { name: "Testing", exact: true }),
  ).toHaveCount(0);
});

test("workspace command validation rejects injected access, invalid IDs and invalid hardware quantities", () => {
  expect(
    commandSchema.safeParse({ type: "employee.archive", id: "not-a-uuid" })
      .success,
  ).toBe(false);
  expect(
    commandSchema.safeParse({
      type: "restaurant.save",
      name: "Restaurant",
      email: "owner@example.com",
      city: "Cape Town",
      superuser: true,
    }).success,
  ).toBe(false);
  for (const quantity of [0, -1, 101, 1.5])
    expect(
      commandSchema.safeParse({
        type: "order.create",
        id: crypto.randomUUID(),
        product: "Personal NFC card",
        quantity,
      }).success,
    ).toBe(false);
  expect(
    mutationSchema.safeParse({
      requestId: crypto.randomUUID(),
      version: 0,
      commands: [],
    }).success,
  ).toBe(false);
});

test("activity captures archive, restore, tag suspension and restaurant changes without mutating fixtures", () => {
  const before = initialState();
  const after = structuredClone(before);
  after.employees[0].deletedAt = new Date().toISOString();
  after.tags[0].status = "suspended";
  after.restaurant.city = "Johannesburg";
  const events = demoActivity(before, after);
  expect(events.map((event) => event.action)).toEqual(
    expect.arrayContaining([
      "restaurant.save",
      "employee.archive",
      "tag.status",
    ]),
  );
  expect(before.employees[0].deletedAt).toBeNull();
  const restored = structuredClone(after);
  restored.employees[0].deletedAt = null;
  expect(demoActivity(after, restored).map((event) => event.action)).toEqual([
    "employee.restore",
  ]);
});
