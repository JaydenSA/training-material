import { createHash } from "node:crypto";
import { z } from "zod";
import type { SQLClient, Transaction } from "./workspace-repository";
import { HttpError } from "../http-error";
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const checkoutSchema = z
  .object({
    amount: z.number().int().min(500).max(1000000),
    employeeId: z.string().uuid(),
    restaurantSlug: z.string().min(1).max(100),
    tagId: z
      .string()
      .regex(/^[a-zA-Z0-9-]{3,64}$/)
      .optional(),
    requestId: z.string().uuid(),
    receiptToken: z.string().uuid(),
  })
  .strict();
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export async function checkoutTarget(client: SQLClient, input: CheckoutInput) {
  const target = (
    await client.query(
      `SELECT r.id,r.clerk_org_id,e.id employee_id FROM restaurants r
     JOIN employees e ON e.restaurant_id=r.id
     WHERE r.slug=$1 AND r.deleted_at IS NULL AND e.id=$2 AND e.deleted_at IS NULL AND e.visible=true
     AND ($3::text IS NULL OR EXISTS (SELECT 1 FROM tags t WHERE t.code=$3 AND t.employee_id=e.id AND t.restaurant_id=r.id AND t.suspended_at IS NULL AND t.deleted_at IS NULL))`,
      [input.restaurantSlug, input.employeeId, input.tagId || null],
    )
  ).rows[0];
  if (!target)
    throw new HttpError(
      404,
      "profile_unavailable",
      "This tipping link is no longer active.",
    );
  return {
    restaurantId: String(target.id),
    organizationId: String(target.clerk_org_id),
  };
}
export async function prepareCheckout(
  transaction: Transaction,
  input: CheckoutInput,
  restaurantId: string,
  mode: "test" | "live",
) {
  return transaction(async (client) => {
    // Recheck employee and tag eligibility inside the transaction.
    const target = await checkoutTarget(client, input);
    if (target.restaurantId !== restaurantId)
      throw new HttpError(409, "workspace_changed", "The restaurant changed.");
    await client.query(
      `INSERT INTO tips(id,restaurant_id,employee_id,amount_cents,receipt_token_hash,processing_mode)
      VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`,
      [
        input.requestId,
        restaurantId,
        input.employeeId,
        input.amount,
        tokenHash(input.receiptToken),
        mode,
      ],
    );
    const tip = (
      await client.query("SELECT * FROM tips WHERE id=$1 FOR UPDATE", [
        input.requestId,
      ])
    ).rows[0];
    if (
      !tip ||
      tip.deleted_at ||
      tip.restaurant_id !== restaurantId ||
      tip.employee_id !== input.employeeId ||
      Number(tip.amount_cents) !== input.amount ||
      tip.receipt_token_hash !== tokenHash(input.receiptToken) ||
      tip.processing_mode !== mode
    )
      throw new HttpError(
        409,
        "idempotency_mismatch",
        "Checkout details changed. Start a new checkout.",
      );
    return {
      id: String(tip.id),
      checkoutId: tip.checkout_id as string | null,
      redirectUrl: tip.checkout_redirect_url as string | null,
    };
  });
}
export async function receipt(client: SQLClient, id: string, token: string) {
  const row = (
    await client.query(
      `SELECT t.id,t.amount_cents,t.status,t.rating,t.review,t.processing_mode,t.created_at,
      e.name employee_name,r.name restaurant_name FROM tips t
      JOIN employees e ON e.id=t.employee_id AND e.restaurant_id=t.restaurant_id JOIN restaurants r ON r.id=t.restaurant_id
      WHERE t.id=$1 AND t.receipt_token_hash=$2 AND t.deleted_at IS NULL`,
      [id, tokenHash(token)],
    )
  ).rows[0];
  if (!row)
    throw new HttpError(
      404,
      "receipt_not_found",
      "This receipt is unavailable in this browser.",
    );
  return {
    id: String(row.id),
    amount: Number(row.amount_cents),
    status: String(row.status),
    rating: row.rating == null ? null : Number(row.rating),
    review: row.review as string | null,
    mode: row.processing_mode as "test" | "live",
    employeeName: String(row.employee_name),
    restaurantName: String(row.restaurant_name),
  };
}
export async function ratePayment(
  transaction: Transaction,
  id: string,
  token: string,
  rating: number,
  review?: string,
) {
  return transaction(async (client) => {
    const result = (
      await client.query(
        `UPDATE tips SET rating=$3,review=$4,rated_at=now()
      WHERE id=$1 AND receipt_token_hash=$2 AND status='paid' AND rating IS NULL AND deleted_at IS NULL RETURNING restaurant_id`,
        [id, tokenHash(token), rating, review?.trim() || null],
      )
    ).rows[0];
    if (!result)
      throw new HttpError(
        409,
        "rating_unavailable",
        "Only confirmed payments can be rated, once per payment.",
      );
    await client.query("UPDATE restaurants SET version=version+1 WHERE id=$1", [
      result.restaurant_id,
    ]);
    return receipt(client, id, token);
  });
}
const eventSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.enum([
    "payment.succeeded",
    "payment.failed",
    "refund.succeeded",
    "refund.failed",
  ]),
  payload: z.object({
    id: z.string().min(1).max(200),
    amount: z.number().int().nonnegative(),
    currency: z.literal("ZAR"),
    mode: z.enum(["test", "live"]),
    status: z.string(),
    metadata: z.object({ checkoutId: z.string().min(1) }),
    refundableAmount: z.number().int().nonnegative().optional(),
  }),
});
export async function applyYocoEvent(
  transaction: Transaction,
  restaurantId: string,
  raw: unknown,
) {
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success)
    throw new HttpError(400, "invalid_event", "Invalid payment notification.");
  const event = parsed.data;
  return transaction(async (client) => {
    const duplicate = (
      await client.query(
        "SELECT restaurant_id FROM webhook_events WHERE id=$1",
        [event.id],
      )
    ).rows[0];
    if (duplicate) {
      if (duplicate.restaurant_id !== restaurantId)
        throw new HttpError(
          409,
          "event_mismatch",
          "Event belongs to a different restaurant.",
        );
      return { duplicate: true };
    }
    const tip = (
      await client.query(
        "SELECT * FROM tips WHERE checkout_id=$1 AND restaurant_id=$2 FOR UPDATE",
        [event.payload.metadata.checkoutId, restaurantId],
      )
    ).rows[0];
    if (!tip)
      throw new HttpError(
        503,
        "checkout_not_ready",
        "Checkout has not been recorded yet. Retry this notification.",
      );
    // Recheck after acquiring the row lock for concurrent deliveries.
    if (
      (
        await client.query("SELECT id FROM webhook_events WHERE id=$1", [
          event.id,
        ])
      ).rows.length
    )
      return { duplicate: true };
    if (
      (
        await client.query(
          "SELECT id FROM webhook_events WHERE restaurant_id=$1 AND type=$2 AND resource_id=$3",
          [restaurantId, event.type, event.payload.id],
        )
      ).rows.length
    )
      return { duplicate: true };
    if (tip.processing_mode !== event.payload.mode)
      throw new HttpError(400, "mode_mismatch", "Payment mode mismatch.");
    const payment = event.type.startsWith("payment.");
    if (payment && Number(tip.amount_cents) !== event.payload.amount)
      throw new HttpError(400, "amount_mismatch", "Payment amount mismatch.");
    if (
      (event.type.endsWith("succeeded") &&
        event.payload.status !== "succeeded") ||
      (event.type.endsWith("failed") && event.payload.status !== "failed")
    )
      throw new HttpError(400, "status_mismatch", "Payment status mismatch.");
    if (
      payment &&
      tip.payment_id &&
      tip.payment_id !== event.payload.id &&
      event.type === "payment.succeeded"
    )
      throw new HttpError(
        409,
        "payment_mismatch",
        "Payment reference mismatch.",
      );
    if (event.type === "payment.succeeded" && tip.status !== "refunded")
      await client.query(
        "UPDATE tips SET status='paid',payment_id=$2 WHERE id=$1",
        [tip.id, event.payload.id],
      );
    if (event.type === "payment.failed" && tip.status === "pending")
      await client.query("UPDATE tips SET status='failed' WHERE id=$1", [
        tip.id,
      ]);
    if (event.type === "refund.succeeded") {
      const refunded = Number(tip.refunded_amount_cents) + event.payload.amount;
      if (
        !["paid", "refunded"].includes(String(tip.status)) ||
        refunded > Number(tip.amount_cents) ||
        event.payload.amount <= 0
      )
        throw new HttpError(
          409,
          "refund_mismatch",
          "Refund needs reconciliation before it can be recorded.",
        );
      await client.query(
        "UPDATE tips SET refunded_amount_cents=$2,status=CASE WHEN $2=amount_cents THEN 'refunded' ELSE status END WHERE id=$1",
        [tip.id, refunded],
      );
    }
    await client.query(
      "INSERT INTO webhook_events(id,restaurant_id,type,resource_id) VALUES($1,$2,$3,$4)",
      [event.id, restaurantId, event.type, event.payload.id],
    );
    await client.query("UPDATE restaurants SET version=version+1 WHERE id=$1", [
      restaurantId,
    ]);
    return { duplicate: false };
  });
}
