import { requireRestaurantAccess } from "@/lib/integrations/auth";
import { getPool, withTransaction } from "@/lib/db";
import { readWorkspace, mutateWorkspace } from "@/lib/db/workspace-repository";
import { mutationSchema } from "@/lib/workspace-contract";
import { getStorageConfiguration } from "@/lib/storage-config";
import { apiError, json } from "@/lib/api-response";
import { HttpError } from "@/lib/http-error";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function requireDatabase() {
  const config = getStorageConfiguration();
  if (!config.enabled)
    throw new HttpError(
      503,
      "database_not_configured",
      "Database storage is not configured.",
    );
}
export async function GET(request: Request) {
  try {
    requireDatabase();
    const access = await requireRestaurantAccess();
    if (request.headers.get("X-Tipit-Organization") !== access.organizationId)
      throw new HttpError(
        409,
        "workspace_changed",
        "Your selected restaurant workspace changed. Refresh and try again.",
      );
    return json(await readWorkspace(getPool(), access.organizationId));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    requireDatabase();
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new HttpError(
        403,
        "invalid_origin",
        "Request origin was rejected.",
      );
    const access = await requireRestaurantAccess();
    if (request.headers.get("X-Tipit-Organization") !== access.organizationId)
      throw new HttpError(
        409,
        "workspace_changed",
        "Your selected restaurant workspace changed. Refresh and try again.",
      );
    const body = await request.text();
    if (body.length > 32768)
      throw new HttpError(413, "request_too_large", "Request is too large.");
    let input;
    try {
      input = mutationSchema.parse(JSON.parse(body));
    } catch {
      throw new HttpError(
        400,
        "invalid_request",
        "The workspace change is invalid.",
      );
    }
    return json(
      await mutateWorkspace(
        withTransaction,
        access.organizationId,
        access.userId,
        input,
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
