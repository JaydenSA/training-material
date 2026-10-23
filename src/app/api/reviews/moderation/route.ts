import { requireRestaurantAccess } from "@/lib/integrations/auth";
import { getPool, withTransaction } from "@/lib/db";
import {
  moderateReview,
  moderationHistory,
} from "@/lib/db/moderation-repository";
import { moderationSchema } from "@/lib/moderation";
import { apiError, json } from "@/lib/api-response";
import { HttpError } from "@/lib/http-error";
import { z } from "zod";
async function accessFor(request: Request) {
  const access = await requireRestaurantAccess();
  if (request.headers.get("X-Tipit-Organization") !== access.organizationId)
    throw new HttpError(
      409,
      "workspace_changed",
      "Refresh your selected restaurant workspace.",
    );
  return access;
}
export async function GET(request: Request) {
  try {
    const access = await accessFor(request);
    const params = new URL(request.url).searchParams;
    const tip = z.string().uuid().safeParse(params.get("tipId"));
    const offset = Number(params.get("offset") || 0);
    if (
      !tip.success ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 100000
    )
      throw new HttpError(
        400,
        "invalid_request",
        "Invalid review history page.",
      );
    return json({
      ...(await moderationHistory(
        getPool(),
        access.organizationId,
        tip.data,
        offset,
      )),
      organizationId: access.organizationId,
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const access = await accessFor(request);
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new HttpError(
        403,
        "invalid_origin",
        "Request origin was rejected.",
      );
    const body = await request.text();
    if (body.length > 4096)
      throw new HttpError(413, "request_too_large", "Request is too large.");
    let raw;
    try {
      raw = JSON.parse(body);
    } catch {
      throw new HttpError(
        400,
        "invalid_request",
        "Invalid moderation request.",
      );
    }
    const input = moderationSchema.safeParse(raw);
    if (!input.success)
      throw new HttpError(
        400,
        "invalid_request",
        "Select a review action and provide a reason of 5–500 characters.",
      );
    return json({
      event: await moderateReview(withTransaction, access, input.data),
      organizationId: access.organizationId,
    });
  } catch (error) {
    return apiError(error);
  }
}
