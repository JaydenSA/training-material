import type { SQLClient } from "./workspace-repository";
export async function readOperations(
  client: SQLClient,
  organizationId: string,
) {
  const result = await client.query(
    `SELECT
    count(*) FILTER(WHERE t.processing_mode='live' AND t.status='failed' AND t.created_at>=now()-interval '24 hours')::int live_failed,
    count(*) FILTER(WHERE t.processing_mode='test' AND t.status='failed' AND t.created_at>=now()-interval '24 hours')::int test_failed,
    count(*) FILTER(WHERE t.processing_mode='live' AND t.status='pending' AND t.created_at<now()-interval '30 minutes')::int live_pending,
    count(*) FILTER(WHERE t.processing_mode='test' AND t.status='pending' AND t.created_at<now()-interval '30 minutes')::int test_pending
    FROM tips t JOIN restaurants r ON r.id=t.restaurant_id WHERE r.clerk_org_id=$1 AND r.deleted_at IS NULL AND t.deleted_at IS NULL`,
    [organizationId],
  );
  const webhook = (
    await client.query(
      "SELECT max(w.created_at) received FROM webhook_events w JOIN restaurants r ON r.id=w.restaurant_id WHERE r.clerk_org_id=$1 AND r.deleted_at IS NULL",
      [organizationId],
    )
  ).rows[0]?.received;
  const row = result.rows[0];
  return {
    liveFailed: Number(row?.live_failed || 0),
    testFailed: Number(row?.test_failed || 0),
    livePending: Number(row?.live_pending || 0),
    testPending: Number(row?.test_pending || 0),
    lastWebhook: webhook
      ? new Date(webhook as string | Date).toISOString()
      : null,
  };
}
