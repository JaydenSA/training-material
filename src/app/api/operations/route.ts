import { requireRestaurantAccess } from "@/lib/integrations/auth";
import { getPool } from "@/lib/db";
import { readOperations } from "@/lib/db/operations-repository";
import { merchantFor, paymentMode } from "@/lib/integrations/yoco-config";
import { apiError, json } from "@/lib/api-response";
import { HttpError } from "@/lib/http-error";
export async function GET(request: Request) {
  try {
    const access = await requireRestaurantAccess();
    if (request.headers.get("X-Tipit-Organization") !== access.organizationId)
      throw new HttpError(
        409,
        "workspace_changed",
        "Refresh your selected restaurant workspace.",
      );
    let mode = "unknown",
      configured = false,
      credentialMatch = false,
      configurationError = false;
    try {
      mode = paymentMode();
      const merchant = merchantFor(access.organizationId);
      configured = !!merchant;
      credentialMatch =
        !!merchant &&
        mode !== "demo" &&
        merchant.mode === (mode === "live" ? "live" : "test");
    } catch {
      configurationError = true;
    }
    return json({
      ...(await readOperations(getPool(), access.organizationId)),
      mode,
      configured,
      credentialMatch,
      configurationError,
      sample: false,
      checkedAt: new Date().toISOString(),
      organizationId: access.organizationId,
    });
  } catch (error) {
    return apiError(error);
  }
}
