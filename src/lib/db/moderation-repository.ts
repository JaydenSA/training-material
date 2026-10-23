import type { SQLClient, Transaction } from "./workspace-repository";
import { moderationSchema, type ModerationEvent } from "../moderation";
import { HttpError } from "../http-error";
import type { z } from "zod";
export const mapModeration = (
  row: Record<string, unknown>,
): ModerationEvent => ({
  id: String(row.id),
  tipId: String(row.tip_id),
  action: row.action as ModerationEvent["action"],
  reason: String(row.reason),
  actorId: String(row.actor_id),
  createdAt: new Date(row.created_at as string | Date).toISOString(),
});
export async function moderateReview(
  transaction: Transaction,
  access: { organizationId: string; userId: string; isOwner: boolean },
  raw: z.infer<typeof moderationSchema>,
) {
  const input = moderationSchema.parse(raw);
  if (input.action !== "flag" && !access.isOwner)
    throw new HttpError(
      403,
      "owner_required",
      "Only the restaurant owner can hide or restore review text.",
    );
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      access.organizationId,
    ]);
    const target = (
      await client.query(
        `SELECT t.id,t.restaurant_id FROM tips t JOIN restaurants r ON r.id=t.restaurant_id
      WHERE r.clerk_org_id=$1 AND r.deleted_at IS NULL AND t.id=$2 AND t.deleted_at IS NULL AND t.rating IS NOT NULL
      AND t.review IS NOT NULL AND length(trim(t.review))>0 AND t.status IN ('paid','refunded') FOR UPDATE OF t`,
        [access.organizationId, input.tipId],
      )
    ).rows[0];
    if (!target)
      throw new HttpError(
        404,
        "review_not_found",
        "This written review is unavailable in your restaurant.",
      );
    const prior = (
      await client.query("SELECT * FROM review_moderations WHERE id=$1", [
        input.requestId,
      ])
    ).rows[0];
    if (prior) {
      if (
        prior.restaurant_id !== target.restaurant_id ||
        prior.tip_id !== input.tipId ||
        prior.actor_id !== access.userId ||
        prior.action !== input.action ||
        prior.reason !== input.reason
      )
        throw new HttpError(
          409,
          "moderation_conflict",
          "This request reference has already been used.",
        );
      return mapModeration(prior);
    }
    const current = (
      await client.query(
        "SELECT action FROM review_moderations WHERE restaurant_id=$1 AND tip_id=$2 ORDER BY sequence DESC LIMIT 1",
        [target.restaurant_id, input.tipId],
      )
    ).rows[0];
    if (current?.action === "hide" && input.action === "flag")
      throw new HttpError(
        409,
        "review_hidden",
        "The review is already hidden. An owner must restore it.",
      );
    const row = (
      await client.query(
        `INSERT INTO review_moderations(id,restaurant_id,tip_id,action,reason,actor_id)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [
          input.requestId,
          target.restaurant_id,
          input.tipId,
          input.action,
          input.reason,
          access.userId,
        ],
      )
    ).rows[0];
    await client.query(
      "INSERT INTO audit_events(restaurant_id,actor_id,action,target_id) VALUES($1,$2,$3,$4)",
      [
        target.restaurant_id,
        access.userId,
        `review.${input.action}`,
        input.tipId,
      ],
    );
    await client.query("UPDATE restaurants SET version=version+1 WHERE id=$1", [
      target.restaurant_id,
    ]);
    return mapModeration(row);
  });
}
export async function moderationHistory(
  client: SQLClient,
  organizationId: string,
  tipId: string,
  offset = 0,
) {
  const result = await client.query(
    `SELECT m.* FROM review_moderations m JOIN restaurants r ON r.id=m.restaurant_id
    WHERE r.clerk_org_id=$1 AND r.deleted_at IS NULL AND m.tip_id=$2 ORDER BY m.sequence DESC LIMIT 51 OFFSET $3`,
    [organizationId, tipId, offset],
  );
  return {
    events: result.rows.slice(0, 50).map(mapModeration),
    hasMore: result.rows.length > 50,
  };
}
