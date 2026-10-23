import { NextRequest } from "next/server";
import { z } from "zod";
import { getPool, withTransaction } from "@/lib/db";
import { ratePayment, receipt } from "@/lib/db/payment-repository";
import { apiError, json } from "@/lib/api-response";
import { HttpError } from "@/lib/http-error";
import { REVIEW_MAX_LENGTH } from "@/lib/reviews";
export const runtime = "nodejs";
const ratingSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    review: z.string().trim().max(REVIEW_MAX_LENGTH).optional(),
  })
  .strict();
async function access(request: NextRequest, params: Promise<{ id: string }>) {
  const { id } = await params;
  const token = request.cookies.get(`tipit-receipt-${id}`)?.value;
  if (
    !z.string().uuid().safeParse(id).success ||
    !token ||
    !z.string().uuid().safeParse(token).success
  )
    throw new HttpError(
      404,
      "receipt_not_found",
      "This receipt is unavailable in this browser.",
    );
  return { id, token };
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id, token } = await access(request, params);
    return json(await receipt(getPool(), id, token));
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new HttpError(403, "invalid_origin", "Invalid origin.");
    const { id, token } = await access(request, params);
    const body = await request.text();
    if (body.length > 8192)
      throw new HttpError(413, "request_too_large", "Review too large.");
    let input;
    try {
      input = ratingSchema.parse(JSON.parse(body));
    } catch {
      throw new HttpError(
        400,
        "invalid_review",
        "Choose 1–5 stars and a review of up to 1,000 characters.",
      );
    }
    return json(
      await ratePayment(withTransaction, id, token, input.rating, input.review),
    );
  } catch (error) {
    return apiError(error);
  }
}
