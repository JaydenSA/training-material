import { test, expect } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID, createHmac } from "node:crypto";
import { readActivity } from "../src/lib/db/activity-repository";
import {
  moderateReview,
  moderationHistory,
} from "../src/lib/db/moderation-repository";
import { readOperations } from "../src/lib/db/operations-repository";
import {
  applyYocoEvent,
  checkoutTarget,
  prepareCheckout,
  ratePayment,
  receipt,
} from "../src/lib/db/payment-repository";
import {
  createYocoCheckout,
  verifyYocoWebhook,
} from "../src/lib/integrations/yoco-client";
import {
  readWorkspace,
  mutateWorkspace,
  readPublicProfile,
  type SQLClient,
  type Transaction,
} from "../src/lib/db/workspace-repository";
import {
  mutationSchema,
  deriveCommands,
  type WorkspaceCommand,
} from "../src/lib/workspace-contract";
let db: PGlite;
let client: SQLClient;
let transaction: Transaction;
test.beforeAll(async () => {
  db = new PGlite();
  await db.waitReady;
  for (const file of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(join("drizzle", file), "utf8"));
  client = {
    query: async (text, values) => ({
      rows: (await db.query<Record<string, unknown>>(text, values)).rows,
    }),
  };
  transaction = (fn) =>
    db.transaction((tx) =>
      fn({
        query: async (text, values) => ({
          rows: (await tx.query<Record<string, unknown>>(text, values)).rows,
        }),
      }),
    );
});
test.afterAll(async () => {
  await db?.close();
});
test.beforeEach(async () => {
  await db.exec("TRUNCATE restaurants CASCADE");
});
const mutate = (
  org: string,
  version: number,
  commands: WorkspaceCommand[],
  requestId = randomUUID(),
) =>
  mutateWorkspace(transaction, org, "test_actor", {
    version,
    commands,
    requestId,
  });
const create = (org: string) =>
  mutate(org, 0, [
    {
      type: "restaurant.save",
      name: org,
      email: "owner@example.com",
      city: "Cape Town",
    },
  ]);
const staff = (id: string): WorkspaceCommand => ({
  type: "employee.create",
  id,
  name: "Test Employee",
  role: "Waiter",
  bio: "Hello",
  color: "#e3eee4",
});

test("first restaurant onboarding creates an empty persisted workspace without sample records", async () => {
  expect((await readWorkspace(client, "org_new_owner")).state).toBeNull();
  const created = await create("org_new_owner");
  expect(created.state).toMatchObject({
    restaurant: { name: "org_new_owner" },
    employees: [],
    tips: [],
    tags: [],
    orders: [],
    onboarded: true,
  });
  const reloaded = await readWorkspace(client, "org_new_owner");
  expect(reloaded.state?.restaurant.name).toBe("org_new_owner");
  expect(reloaded.version).toBe(created.version);
  expect((await readWorkspace(client, "org_other_owner")).state).toBeNull();
});

test("review moderation preserves originals, enforces owner actions and isolates tenant history", async () => {
  await create("org_A");
  await create("org_B");
  const employeeId = randomUUID(),
    tipId = randomUUID();
  await mutate("org_A", 1, [staff(employeeId)]);
  const restaurantId = (
    await client.query("SELECT id FROM restaurants WHERE clerk_org_id='org_A'")
  ).rows[0].id;
  await client.query(
    "INSERT INTO tips(id,restaurant_id,employee_id,amount_cents,status,rating,review,rated_at,receipt_token_hash) VALUES($1,$2,$3,5000,'paid',2,'Original customer words',now(),'test-hash')",
    [tipId, restaurantId, employeeId],
  );
  const manager = {
    organizationId: "org_A",
    userId: "manager_actor",
    isOwner: false,
  };
  const flag = {
    requestId: randomUUID(),
    tipId,
    action: "flag" as const,
    reason: "Inappropriate personal information",
  };
  await moderateReview(transaction, manager, flag);
  await moderateReview(transaction, manager, flag);
  expect((await moderationHistory(client, "org_A", tipId)).events).toHaveLength(
    1,
  );
  await expect(
    moderateReview(transaction, manager, {
      ...flag,
      requestId: randomUUID(),
      action: "hide",
    }),
  ).rejects.toMatchObject({ status: 403 });
  const owner = { ...manager, userId: "owner_actor", isOwner: true };
  await expect(
    moderateReview(
      transaction,
      { ...owner, organizationId: "org_B" },
      { ...flag, requestId: randomUUID(), action: "hide" },
    ),
  ).rejects.toMatchObject({ status: 404 });
  await moderateReview(transaction, owner, {
    ...flag,
    requestId: randomUUID(),
    action: "hide",
    reason: "Contains personal contact details",
  });
  expect(
    (await readWorkspace(client, "org_A")).state?.moderations?.[0].action,
  ).toBe("hide");
  await expect(
    moderateReview(transaction, manager, { ...flag, requestId: randomUUID() }),
  ).rejects.toMatchObject({ status: 409 });
  await moderateReview(transaction, owner, {
    ...flag,
    requestId: randomUUID(),
    action: "restore",
    reason: "Flag reviewed and text restored",
  });
  const history = await moderationHistory(client, "org_A", tipId);
  expect(history.events.map((event) => event.action)).toEqual([
    "restore",
    "hide",
    "flag",
  ]);
  expect(history.events[0].actorId).toBe("owner_actor");
  expect((await moderationHistory(client, "org_B", tipId)).events).toEqual([]);
  const original = (
    await client.query(
      "SELECT amount_cents,rating,review FROM tips WHERE id=$1",
      [tipId],
    )
  ).rows[0];
  expect(original).toEqual({
    amount_cents: 5000,
    rating: 2,
    review: "Original customer words",
  });
  expect(
    (await readActivity(client, "org_A")).events.filter((event) =>
      event.action.startsWith("review."),
    ),
  ).toHaveLength(3);
  const other = (
    await client.query("SELECT id FROM restaurants WHERE clerk_org_id='org_B'")
  ).rows[0].id;
  await expect(
    client.query(
      "INSERT INTO review_moderations(id,restaurant_id,tip_id,action,reason,actor_id) VALUES($1,$2,$3,'hide','Foreign tenant action','actor')",
      [randomUUID(), other, tipId],
    ),
  ).rejects.toMatchObject({ code: "23503" });
});

test("operational counts are tenant-scoped and keep live/test outcomes separate", async () => {
  for (const org of ["org_A", "org_B"]) {
    await create(org);
    const employeeId = randomUUID();
    await mutate(org, 1, [staff(employeeId)]);
    const restaurantId = (
      await client.query("SELECT id FROM restaurants WHERE clerk_org_id=$1", [
        org,
      ])
    ).rows[0].id;
    for (const [status, mode] of [
      ["failed", "live"],
      ["failed", "test"],
      ["pending", "live"],
    ])
      await client.query(
        "INSERT INTO tips(id,restaurant_id,employee_id,amount_cents,status,processing_mode,receipt_token_hash,created_at) VALUES($1,$2,$3,5000,$4,$5,'hash',now()-interval '1 hour')",
        [randomUUID(), restaurantId, employeeId, status, mode],
      );
  }
  expect(await readOperations(client, "org_A")).toMatchObject({
    liveFailed: 1,
    testFailed: 1,
    livePending: 1,
    testPending: 0,
    lastWebhook: null,
  });
  expect(await readOperations(client, "org_unknown")).toMatchObject({
    liveFailed: 0,
    testFailed: 0,
    livePending: 0,
  });
});

test("bulk tag batches roll back atomically when any employee is invalid", async () => {
  await create("org_A");
  const employeeId = randomUUID();
  await mutate("org_A", 1, [staff(employeeId)]);
  await expect(
    mutate("org_A", 2, [
      {
        type: "tag.create",
        code: "BULK-VALID",
        employeeId,
        format: "QR stand",
      },
      {
        type: "tag.create",
        code: "BULK-INVALID",
        employeeId: randomUUID(),
        format: "NFC card",
      },
    ]),
  ).rejects.toBeDefined();
  expect((await readWorkspace(client, "org_A")).state?.tags).toEqual([]);
  expect((await readWorkspace(client, "org_A")).version).toBe(2);
});

test("activity history is restaurant scoped and preserves the verified actor", async () => {
  await create("org_A");
  await create("org_B");
  const employeeId = randomUUID();
  await mutate("org_A", 1, [staff(employeeId)]);
  const activity = await readActivity(client, "org_A");
  expect(activity.events).toHaveLength(2);
  expect(activity.events.every((event) => event.actorId === "test_actor")).toBe(
    true,
  );
  expect(
    activity.events.some(
      (event) =>
        event.action === "employee.create" && event.targetId === employeeId,
    ),
  ).toBe(true);
  expect(activity.events.some((event) => event.targetName === "org_B")).toBe(
    false,
  );
  expect((await readActivity(client, "org_B")).events).toHaveLength(1);
});

test("Yoco checkout attribution and retry keys stay bound to one restaurant and receipt", async () => {
  await create("org_A");
  await create("org_B");
  const employeeId = randomUUID();
  await mutate("org_A", 1, [
    staff(employeeId),
    { type: "tag.create", code: "YOCO-001", employeeId, format: "NFC card" },
  ]);
  const workspace = (await readWorkspace(client, "org_A")).state!;
  const input = {
    amount: 5000,
    employeeId,
    restaurantSlug: workspace.restaurant.slug,
    tagId: "YOCO-001",
    requestId: randomUUID(),
    receiptToken: randomUUID(),
  };
  const target = await checkoutTarget(client, input);
  const pending = await prepareCheckout(
    transaction,
    input,
    target.restaurantId,
    "test",
  );
  expect(
    await prepareCheckout(transaction, input, target.restaurantId, "test"),
  ).toEqual(pending);
  expect((await client.query("SELECT id FROM tips")).rows).toHaveLength(1);
  await expect(
    prepareCheckout(
      transaction,
      { ...input, amount: 6000 },
      target.restaurantId,
      "test",
    ),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    checkoutTarget(client, {
      ...input,
      restaurantSlug: (await readWorkspace(client, "org_B")).state!.restaurant
        .slug,
    }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(receipt(client, pending.id, randomUUID())).rejects.toMatchObject(
    { status: 404 },
  );
  await expect(
    ratePayment(transaction, pending.id, input.receiptToken, 5, "Too early"),
  ).rejects.toMatchObject({ status: 409 });
  await mutate("org_A", 2, [
    { type: "tag.status", code: "YOCO-001", status: "suspended" },
  ]);
  await expect(checkoutTarget(client, input)).rejects.toMatchObject({
    status: 404,
  });
});

test("Yoco events confirm payments once, enforce financial matches and protect real ratings", async () => {
  await create("org_A");
  const employeeId = randomUUID();
  await mutate("org_A", 1, [staff(employeeId)]);
  const state = (await readWorkspace(client, "org_A")).state!;
  const input = {
    amount: 5000,
    employeeId,
    restaurantSlug: state.restaurant.slug,
    requestId: randomUUID(),
    receiptToken: randomUUID(),
  };
  const target = await checkoutTarget(client, input);
  await prepareCheckout(transaction, input, target.restaurantId, "test");
  await client.query(
    "UPDATE tips SET checkout_id='checkout_test_1' WHERE id=$1",
    [input.requestId],
  );
  const event = {
    id: "evt_paid",
    type: "payment.succeeded",
    payload: {
      id: "payment_1",
      amount: 5000,
      currency: "ZAR",
      mode: "test",
      status: "succeeded",
      metadata: { checkoutId: "checkout_test_1" },
    },
  };
  await expect(
    applyYocoEvent(transaction, target.restaurantId, {
      ...event,
      payload: { ...event.payload, amount: 5001 },
    }),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    applyYocoEvent(transaction, target.restaurantId, {
      ...event,
      payload: { ...event.payload, mode: "live" },
    }),
  ).rejects.toMatchObject({ status: 400 });
  expect(
    (await client.query("SELECT id FROM webhook_events")).rows,
  ).toHaveLength(0);
  expect(await applyYocoEvent(transaction, target.restaurantId, event)).toEqual(
    { duplicate: false },
  );
  expect(await applyYocoEvent(transaction, target.restaurantId, event)).toEqual(
    { duplicate: true },
  );
  await applyYocoEvent(transaction, target.restaurantId, {
    ...event,
    id: "evt_late_failure",
    type: "payment.failed",
    payload: { ...event.payload, status: "failed" },
  });
  expect(
    (await receipt(client, input.requestId, input.receiptToken)).status,
  ).toBe("paid");
  const reviewed = await ratePayment(
    transaction,
    input.requestId,
    input.receiptToken,
    5,
    "Excellent service",
  );
  expect(reviewed.review).toBe("Excellent service");
  await expect(
    ratePayment(transaction, input.requestId, input.receiptToken, 1),
  ).rejects.toMatchObject({ status: 409 });
  const publicState = await readPublicProfile(client, {
    slug: state.restaurant.slug,
    employeeId,
  });
  expect(publicState!.employees[0].ratingSummary?.count).toBe(0);
  const refund = {
    id: "evt_refund",
    type: "refund.succeeded",
    payload: { ...event.payload, id: "refund_1", amount: 2000 },
  };
  await applyYocoEvent(transaction, target.restaurantId, refund);
  expect(
    await applyYocoEvent(transaction, target.restaurantId, {
      ...refund,
      id: "evt_same_refund_again",
    }),
  ).toEqual({ duplicate: true });
  await applyYocoEvent(transaction, target.restaurantId, {
    ...refund,
    id: "evt_remaining",
    payload: { ...refund.payload, id: "refund_2", amount: 3000 },
  });
  expect(
    (await receipt(client, input.requestId, input.receiptToken)).status,
  ).toBe("refunded");
  await applyYocoEvent(transaction, target.restaurantId, {
    ...event,
    id: "evt_late_success",
  });
  expect(
    (await receipt(client, input.requestId, input.receiptToken)).status,
  ).toBe("refunded");
});

test("Yoco signatures reject tampering, stale timestamps and wrong merchant secrets", async () => {
  const body = JSON.stringify({ id: "evt_1" });
  const key = Buffer.from("test-only-webhook-secret");
  const signature = createHmac("sha256", key)
    .update(`message_1.1000.${body}`)
    .digest("base64");
  const headers = new Headers({
    "webhook-id": "message_1",
    "webhook-timestamp": "1000",
    "webhook-signature": `v1,${signature}`,
  });
  const secret = `whsec_${key.toString("base64")}`;
  expect(verifyYocoWebhook(body, headers, secret, 1001)).toBe(true);
  expect(verifyYocoWebhook(body + " ", headers, secret, 1001)).toBe(false);
  expect(verifyYocoWebhook(body, headers, secret, 1181)).toBe(false);
  expect(
    verifyYocoWebhook(
      body,
      headers,
      `whsec_${Buffer.from("another-merchant").toString("base64")}`,
      1001,
    ),
  ).toBe(false);
});

test("Yoco adapter uses merchant credentials and rejects foreign redirects and mode mismatches", async () => {
  const original = globalThis.fetch;
  const input = {
    secretKey: "sk_test_fixture",
    tipId: randomUUID(),
    restaurantId: randomUUID(),
    employeeId: randomUUID(),
    amount: 5000,
    baseUrl: "https://tipit.example",
    mode: "test" as const,
  };
  let result = {
    id: "checkout_1",
    amount: 5000,
    currency: "ZAR",
    processingMode: "test",
    redirectUrl: "https://c.yoco.com/checkout/1",
  };
  globalThis.fetch = async (url, options) => {
    expect(url).toBe("https://payments.yoco.com/api/checkouts");
    expect(new Headers(options?.headers).get("Authorization")).toBe(
      "Bearer sk_test_fixture",
    );
    expect(new Headers(options?.headers).get("Idempotency-Key")).toBe(
      input.tipId,
    );
    expect(JSON.parse(String(options?.body)).metadata.employeeId).toBe(
      input.employeeId,
    );
    return Response.json(result);
  };
  try {
    expect((await createYocoCheckout(input)).checkoutId).toBe("checkout_1");
    result = {
      ...result,
      redirectUrl: "https://yoco.com.attacker.example/checkout",
    };
    await expect(createYocoCheckout(input)).rejects.toThrow(
      "Invalid checkout redirect",
    );
    result = {
      ...result,
      redirectUrl: "https://c.yoco.com/checkout/1",
      processingMode: "live",
    };
    await expect(createYocoCheckout(input)).rejects.toThrow("did not match");
  } finally {
    globalThis.fetch = original;
  }
});
test("tenant isolation blocks cross-restaurant reads, writes and foreign keys", async () => {
  const a = await create("org_A");
  await create("org_B");
  const employeeId = randomUUID();
  await mutate("org_A", a.version, [staff(employeeId)]);
  expect((await readWorkspace(client, "org_B")).state?.employees).toEqual([]);
  await expect(
    mutate("org_B", 1, [{ type: "employee.archive", id: employeeId }]),
  ).rejects.toMatchObject({ status: 404 });
  const b = (
    await client.query("SELECT id FROM restaurants WHERE clerk_org_id=$1", [
      "org_B",
    ])
  ).rows[0];
  await expect(
    client.query(
      "INSERT INTO tags(code,restaurant_id,employee_id,format) VALUES('BAD-CROSS',$1,$2,'NFC card')",
      [b.id, employeeId],
    ),
  ).rejects.toMatchObject({ code: "23503" });
  expect(
    (await readWorkspace(client, "org_A")).state?.employees[0].deletedAt,
  ).toBeNull();
});
test("archival suspends links, retains transactions and restores without reactivating tags", async () => {
  await create("org_A");
  const id = randomUUID();
  await mutate("org_A", 1, [
    staff(id),
    {
      type: "tag.create",
      code: "TEST-001",
      employeeId: id,
      format: "NFC card",
    },
  ]);
  const restaurant = (
    await client.query("SELECT id FROM restaurants WHERE clerk_org_id=$1", [
      "org_A",
    ])
  ).rows[0];
  await client.query(
    "INSERT INTO tips(restaurant_id,employee_id,amount_cents,status,receipt_token_hash,rating,rated_at,review) VALUES($1,$2,5000,'paid','private-hash',4,now(),'Friendly and attentive service.')",
    [restaurant.id, id],
  );
  const publicState = await readPublicProfile(client, { code: "TEST-001" });
  expect(publicState?.tips).toEqual([]);
  expect(publicState?.restaurant.email).toBe("");
  expect(publicState?.employees[0].ratingSummary).toEqual({
    count: 1,
    average: 4,
  });
  const archived = await mutate("org_A", 2, [{ type: "employee.archive", id }]);
  expect(archived.state?.tags[0].status).toBe("suspended");
  expect(archived.state?.tips).toHaveLength(1);
  expect(archived.state?.tips[0].review).toBe(
    "Friendly and attentive service.",
  );
  expect(await readPublicProfile(client, { code: "TEST-001" })).toBeNull();
  await mutate("org_A", 3, [{ type: "employee.restore", id }]);
  expect(await readPublicProfile(client, { code: "TEST-001" })).toBeNull();
  await mutate("org_A", 4, [
    { type: "tag.status", code: "TEST-001", status: "active" },
  ]);
  expect(await readPublicProfile(client, { code: "TEST-001" })).not.toBeNull();
});
test("retries are idempotent and stale versions cannot overwrite changes", async () => {
  await create("org_A");
  const id = randomUUID();
  const requestId = randomUUID();
  const commands = [staff(id)];
  const first = await mutate("org_A", 1, commands, requestId);
  const retry = await mutate("org_A", 1, commands, requestId);
  expect(retry.version).toBe(first.version);
  expect(retry.state?.employees).toHaveLength(1);
  await expect(
    mutate("org_A", 1, [{ type: "employee.archive", id }]),
  ).rejects.toMatchObject({ status: 409, code: "version_conflict" });
  await expect(
    mutate("org_A", 1, [{ type: "employee.restore", id }], requestId),
  ).rejects.toMatchObject({ status: 409, code: "idempotency_conflict" });
  const events = (
    await client.query("SELECT count(*)::int n FROM audit_events")
  ).rows[0];
  expect(events.n).toBe(2);
});
test("failed batches roll back every change and preserve the version", async () => {
  await create("org_A");
  const id = randomUUID();
  await expect(
    mutate("org_A", 1, [
      staff(id),
      {
        type: "tag.create",
        code: "TEST-FAIL",
        employeeId: randomUUID(),
        format: "NFC card",
      },
    ]),
  ).rejects.toMatchObject({ status: 404 });
  const result = await readWorkspace(client, "org_A");
  expect(result.version).toBe(1);
  expect(result.state?.employees).toEqual([]);
});
test("payment constraints reject invalid money and unearned ratings", async () => {
  await create("org_A");
  const id = randomUUID();
  await mutate("org_A", 1, [staff(id)]);
  const restaurant = (await client.query("SELECT id FROM restaurants")).rows[0];
  await expect(
    client.query(
      "INSERT INTO tips(restaurant_id,employee_id,amount_cents,status,receipt_token_hash,review) VALUES($1,$2,1000,'paid','hash','Review without stars')",
      [restaurant.id, id],
    ),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client.query(
      "INSERT INTO tips(restaurant_id,employee_id,amount_cents,status,receipt_token_hash,rating,rated_at,review) VALUES($1,$2,1000,'paid','hash',5,now(),$3)",
      [restaurant.id, id, "x".repeat(1001)],
    ),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client.query(
      "INSERT INTO tips(restaurant_id,employee_id,amount_cents,receipt_token_hash) VALUES($1,$2,-1,'hash')",
      [restaurant.id, id],
    ),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    client.query(
      "INSERT INTO tips(restaurant_id,employee_id,amount_cents,receipt_token_hash,rating,rated_at) VALUES($1,$2,1000,'hash',5,now())",
      [restaurant.id, id],
    ),
  ).rejects.toMatchObject({ code: "23514" });
  const state = (await readWorkspace(client, "org_A")).state!;
  expect(() =>
    deriveCommands(state, {
      ...state,
      tips: [
        {
          id: "fake",
          employeeId: id,
          amount: 1000,
          status: "paid",
          createdAt: new Date().toISOString(),
        },
      ],
    }),
  ).toThrow("controlled by the server");
});
test("hardware drafts use server prices and requests reject injected fields", async () => {
  await create("org_A");
  const result = await mutate("org_A", 1, [
    {
      type: "order.create",
      id: randomUUID(),
      product: "Personal NFC card",
      quantity: 2,
    },
  ]);
  expect(result.state?.orders[0].amount).toBe(15800);
  expect(
    mutationSchema.safeParse({
      requestId: randomUUID(),
      version: 2,
      commands: [
        {
          type: "order.create",
          id: randomUUID(),
          product: "Personal NFC card",
          quantity: 1,
          amount: 1,
        },
      ],
    }).success,
  ).toBe(false);
  expect(
    (await client.query("SELECT status FROM hardware_orders")).rows[0].status,
  ).toBe("draft");
});
