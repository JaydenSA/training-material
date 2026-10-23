import type { SQLClient } from "./workspace-repository";
import type { ActivityEvent } from "../activity";
export async function readActivity(
  client: SQLClient,
  organizationId: string,
  offset = 0,
) {
  const result = await client.query(
    `SELECT a.id,a.actor_id,a.action,a.target_id,a.created_at,
    CASE WHEN a.action LIKE 'employee.%' THEN e.name WHEN a.action='restaurant.save' THEN r.name ELSE a.target_id END target_name
    FROM audit_events a JOIN restaurants r ON r.id=a.restaurant_id
    LEFT JOIN employees e ON e.id::text=a.target_id AND e.restaurant_id=r.id
    WHERE r.clerk_org_id=$1 AND r.deleted_at IS NULL ORDER BY a.created_at DESC,a.id DESC LIMIT 51 OFFSET $2`,
    [organizationId, offset],
  );
  const events: ActivityEvent[] = result.rows.slice(0, 50).map((row) => ({
    id: String(row.id),
    actorId: String(row.actor_id),
    action: String(row.action),
    targetId: String(row.target_id),
    targetName: row.target_name ? String(row.target_name) : undefined,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
  }));
  return { events, hasMore: result.rows.length > 50 };
}
