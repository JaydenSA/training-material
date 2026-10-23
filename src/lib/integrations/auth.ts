import "server-only";
import { auth } from "@clerk/nextjs/server";
import { HttpError } from "@/lib/http-error";
import { getAuthConfiguration } from "@/lib/auth-config";
/** All future tenant repositories must use this organization from the verified
 * session, never a client-submitted restaurant/organization identifier. */
export async function requireRestaurantAccess() {
  if (!getAuthConfiguration().enabled)
    throw new HttpError(
      401,
      "sign_in_required",
      "Sign in to access your restaurant.",
    );
  const session = await auth();
  if (!session.userId)
    throw new HttpError(
      401,
      "sign_in_required",
      "Sign in to access your restaurant.",
    );
  if (!session.orgId)
    throw new HttpError(
      409,
      "organization_required",
      "Choose or create a restaurant workspace.",
    );
  if (
    !session.has({ role: "org:admin" }) &&
    !session.has({ role: "org:manager" })
  )
    throw new HttpError(
      403,
      "management_required",
      "Only restaurant owners and managers can access this workspace.",
    );
  return {
    userId: session.userId,
    organizationId: session.orgId,
    isOwner: session.has({ role: "org:admin" }),
  };
}
