import { clerkClient } from "@clerk/nextjs/server";
import { requireRestaurantAccess } from "@/lib/integrations/auth";
import { getPool } from "@/lib/db";
import { readActivity } from "@/lib/db/activity-repository";
import { apiError, json } from "@/lib/api-response";
import { HttpError } from "@/lib/http-error";
export async function GET(request: Request) {
  try {
    const access = await requireRestaurantAccess();
    if (request.headers.get("X-Tipit-Organization") !== access.organizationId)
      throw new HttpError(
        409,
        "workspace_changed",
        "Your selected restaurant changed. Refresh and try again.",
      );
    const offset = Number(new URL(request.url).searchParams.get("offset") || 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      throw new HttpError(400, "invalid_offset", "Invalid activity page.");
    const result = await readActivity(getPool(), access.organizationId, offset);
    const actorIds = [...new Set(result.events.map((event) => event.actorId))];
    try {
      if (actorIds.length) {
        const client = await clerkClient();
        const users = await client.users.getUserList({
          userId: actorIds,
          limit: 100,
        });
        for (const event of result.events) {
          const user = users.data.find((person) => person.id === event.actorId);
          event.actorName = user
            ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              user.username ||
              event.actorId
            : event.actorId;
        }
      }
    } catch {
      /* The verified actor ID remains visible if Clerk name lookup fails. */
    }
    return json({ ...result, organizationId: access.organizationId });
  } catch (error) {
    return apiError(error);
  }
}
