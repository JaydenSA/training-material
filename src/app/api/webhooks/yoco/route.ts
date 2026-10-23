import { z } from "zod";
import { getPool, withTransaction } from "@/lib/db";
import { applyYocoEvent } from "@/lib/db/payment-repository";
import { verifyYocoWebhook } from "@/lib/integrations/yoco";
import { merchantFor } from "@/lib/integrations/yoco-config";
import { getStorageConfiguration } from "@/lib/storage-config";
import { apiError, json } from "@/lib/api-response";
import { HttpError } from "@/lib/http-error";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (!getStorageConfiguration().enabled)
      throw new HttpError(
        503,
        "storage_required",
        "Payment persistence is not configured.",
      );
    const id = new URL(request.url).searchParams.get("restaurant");
    if (!z.string().uuid().safeParse(id).success)
      throw new HttpError(
        400,
        "restaurant_required",
        "A restaurant webhook URL is required.",
      );
    const restaurant = (
      await getPool().query(
        "SELECT clerk_org_id FROM restaurants WHERE id=$1",
        [id],
      )
    ).rows[0];
    const merchant = restaurant ? merchantFor(restaurant.clerk_org_id) : null;
    if (!merchant)
      throw new HttpError(
        503,
        "merchant_not_connected",
        "Webhook verification is not configured.",
      );
    const body = await request.text();
    if (body.length > 65536)
      throw new HttpError(413, "request_too_large", "Notification too large.");
    if (!verifyYocoWebhook(body, request.headers, merchant.webhookSecret))
      throw new HttpError(
        403,
        "invalid_signature",
        "Webhook signature rejected.",
      );
    let event;
    try {
      event = JSON.parse(body);
    } catch {
      throw new HttpError(400, "invalid_event", "Invalid event body.");
    }
    if (
      ![
        "payment.succeeded",
        "payment.failed",
        "refund.succeeded",
        "refund.failed",
      ].includes(event.type)
    )
      return json({ ignored: true });
    return json(await applyYocoEvent(withTransaction, id!, event));
  } catch (error) {
    return apiError(error);
  }
}
