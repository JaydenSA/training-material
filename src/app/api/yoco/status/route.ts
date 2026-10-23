import { requireRestaurantAccess } from "@/lib/integrations/auth";
import { getPool } from "@/lib/db";
import {
  appBaseUrl,
  merchantFor,
  paymentMode,
} from "@/lib/integrations/yoco-config";
import { apiError, json } from "@/lib/api-response";
export async function GET() {
  try {
    const access = await requireRestaurantAccess();
    const restaurant = (
      await getPool().query(
        "SELECT id FROM restaurants WHERE clerk_org_id=$1 AND deleted_at IS NULL",
        [access.organizationId],
      )
    ).rows[0];
    const merchant = merchantFor(access.organizationId);
    const mode = paymentMode();
    return json({
      organizationId: access.organizationId,
      configured: !!merchant,
      enabled:
        !!merchant &&
        mode !== "demo" &&
        merchant.mode === (mode === "live" ? "live" : "test"),
      mode,
      credentialMode: merchant?.mode || null,
      webhookUrl: restaurant
        ? `${appBaseUrl()}/api/webhooks/yoco?restaurant=${restaurant.id}`
        : null,
    });
  } catch (error) {
    return apiError(error);
  }
}
