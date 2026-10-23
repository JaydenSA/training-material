import { NextResponse } from "next/server";
import { z } from "zod";
import { getStorageConfiguration } from "@/lib/storage-config";
import { getPool, withTransaction } from "@/lib/db";
import {
  checkoutSchema,
  checkoutTarget,
  prepareCheckout,
} from "@/lib/db/payment-repository";
import { createYocoCheckout } from "@/lib/integrations/yoco";
import {
  appBaseUrl,
  merchantFor,
  paymentMode,
} from "@/lib/integrations/yoco-config";
import { apiError, json } from "@/lib/api-response";
import { HttpError } from "@/lib/http-error";
export const runtime = "nodejs";
export const maxDuration = 60;
const demoInput = z
  .object({
    amount: z.number().int().min(500).max(1000000),
    employeeId: z.string().min(1).max(100),
    tagId: z.string().max(100).optional(),
    restaurantSlug: z.string().max(100).optional(),
    requestId: z.string().uuid().optional(),
    receiptToken: z.string().uuid().optional(),
    demo: z.boolean().optional(),
  })
  .strict();
export async function POST(request: Request) {
  try {
    if (
      request.headers.get("origin") &&
      request.headers.get("origin") !== new URL(request.url).origin
    )
      throw new HttpError(403, "invalid_origin", "Invalid origin.");
    const body = await request.text();
    if (body.length > 4096)
      throw new HttpError(413, "request_too_large", "Request too large.");
    let input;
    try {
      input = demoInput.parse(JSON.parse(body));
    } catch {
      throw new HttpError(
        400,
        "invalid_checkout",
        "Choose a valid employee and a tip between R5 and R10,000.",
      );
    }
    const mode = paymentMode();
    const simulated = () =>
      json({ mode: "demo", id: `demo-${crypto.randomUUID()}` });
    if (getStorageConfiguration().invalid)
      throw new HttpError(
        503,
        "storage_required",
        "Database configuration is incomplete.",
      );
    if (mode === "demo" || input.demo) return simulated();
    if (!getStorageConfiguration().enabled)
      throw new HttpError(
        503,
        "storage_required",
        "Yoco payments require database storage.",
      );
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new HttpError(403, "invalid_origin", "Invalid origin.");
    const { demo: ignored, ...raw } = input;
    void ignored;
    const parsed = checkoutSchema.safeParse(raw);
    if (!parsed.success)
      throw new HttpError(
        400,
        "invalid_checkout",
        "Refresh this tipping page before starting checkout.",
      );
    const details = parsed.data;
    const target = await checkoutTarget(getPool(), details);
    const merchant = merchantFor(target.organizationId);
    if (!merchant && mode === "yoco_test") return simulated();
    if (!merchant || merchant.mode !== (mode === "live" ? "live" : "test"))
      throw new HttpError(
        503,
        "merchant_not_connected",
        "This restaurant is not connected for this payment mode.",
      );
    const baseUrl = appBaseUrl();
    if (request.headers.get("origin") !== baseUrl)
      throw new HttpError(
        503,
        "return_origin_mismatch",
        "Open this tipping page using the configured application URL before starting Yoco checkout.",
      );
    const pending = await prepareCheckout(
      withTransaction,
      details,
      target.restaurantId,
      merchant.mode,
    );
    let redirectUrl = pending.redirectUrl;
    if (!pending.checkoutId || !redirectUrl) {
      let checkout;
      try {
        checkout = await createYocoCheckout({
          secretKey: merchant.secretKey,
          tipId: pending.id,
          restaurantId: target.restaurantId,
          employeeId: details.employeeId,
          amount: details.amount,
          baseUrl,
          mode: merchant.mode,
        });
      } catch {
        throw new HttpError(
          502,
          "provider_unavailable",
          "Yoco checkout could not be confirmed. Retry with the same amount; no payment has been confirmed.",
        );
      }
      await getPool().query(
        "UPDATE tips SET checkout_id=$2,checkout_redirect_url=$3 WHERE id=$1 AND restaurant_id=$4",
        [
          pending.id,
          checkout.checkoutId,
          checkout.redirectUrl,
          target.restaurantId,
        ],
      );
      redirectUrl = checkout.redirectUrl;
    }
    const response = NextResponse.json(
      { mode: merchant.mode, id: pending.id, redirectUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(`tipit-receipt-${pending.id}`, details.receiptToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(baseUrl).protocol === "https:",
      path: "/api/payments",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
