import { randomUUID, createHash } from "node:crypto";
import type { DemoState } from "../demo";
import { HttpError } from "../http-error";
import { catalog, type WorkspaceCommand } from "../workspace-contract";
import { mapModeration } from "./moderation-repository";
export interface SQLClient {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }>;
}
export type Transaction = <T>(
  fn: (client: SQLClient) => Promise<T>,
) => Promise<T>;
export type WorkspaceResult = { state: DemoState | null; version: number };
const iso = (value: unknown) =>
  value ? new Date(value as string | Date).toISOString() : null;
export async function readWorkspace(
  client: SQLClient,
  organizationId: string,
): Promise<WorkspaceResult> {
  const restaurant = (
    await client.query(
      "SELECT id,name,slug,email,city,version FROM restaurants WHERE clerk_org_id=$1 AND deleted_at IS NULL",
      [organizationId],
    )
  ).rows[0];
  if (!restaurant) return { state: null, version: 0 };
  const [staff, payments, links, orders, subscription, moderation] =
    await Promise.all([
      client.query(
        "SELECT id,name,role,bio,color,deleted_at FROM employees WHERE restaurant_id=$1 ORDER BY created_at,id",
        [restaurant.id],
      ),
      client.query(
        "SELECT id,employee_id,amount_cents,status,created_at,rating,review,processing_mode,refunded_amount_cents FROM tips WHERE restaurant_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC",
        [restaurant.id],
      ),
      client.query(
        "SELECT code,employee_id,format,suspended_at,deleted_at FROM tags WHERE restaurant_id=$1 ORDER BY created_at,id",
        [restaurant.id],
      ),
      client.query(
        "SELECT id,product,quantity,amount_cents,created_at FROM hardware_orders WHERE restaurant_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC",
        [restaurant.id],
      ),
      client.query(
        "SELECT status FROM subscriptions WHERE restaurant_id=$1 AND deleted_at IS NULL",
        [restaurant.id],
      ),
      client.query(
        "SELECT DISTINCT ON(tip_id) * FROM review_moderations WHERE restaurant_id=$1 ORDER BY tip_id,sequence DESC",
        [restaurant.id],
      ),
    ]);
  return {
    version: Number(restaurant.version),
    state: {
      moderations: moderation.rows.map(mapModeration),
      restaurant: {
        name: String(restaurant.name),
        slug: String(restaurant.slug),
        email: String(restaurant.email),
        city: String(restaurant.city),
      },
      employees: staff.rows.map((e) => ({
        id: String(e.id),
        name: String(e.name),
        role: String(e.role),
        bio: String(e.bio),
        color: String(e.color),
        deletedAt: iso(e.deleted_at),
      })),
      tips: payments.rows.map((t) => ({
        id: String(t.id),
        employeeId: String(t.employee_id),
        amount: Number(t.amount_cents),
        status: t.status as DemoState["tips"][number]["status"],
        createdAt: iso(t.created_at)!,
        rating: t.rating === null ? undefined : Number(t.rating),
        review: t.review == null ? undefined : String(t.review),
        processingMode: t.processing_mode as "test" | "live",
        refundedAmount: Number(t.refunded_amount_cents || 0),
      })),
      tags: links.rows.map((t) => ({
        id: String(t.code),
        employeeId: String(t.employee_id),
        type: t.format as "NFC card" | "QR stand",
        status: t.deleted_at
          ? "deleted"
          : t.suspended_at
            ? "suspended"
            : "active",
      })),
      orders: orders.rows.map((o) => ({
        id: String(o.id),
        product: String(o.product),
        quantity: Number(o.quantity),
        amount: Number(o.amount_cents),
        createdAt: iso(o.created_at)!,
      })),
      plan: subscription.rows[0]
        ? String(subscription.rows[0].status)
        : "Not subscribed",
      onboarded: true,
    },
  };
}
async function employee(client: SQLClient, id: string, restaurantId: unknown) {
  const value = (
    await client.query(
      "SELECT id,deleted_at FROM employees WHERE id=$1 AND restaurant_id=$2 FOR UPDATE",
      [id, restaurantId],
    )
  ).rows[0];
  if (!value)
    throw new HttpError(
      404,
      "employee_not_found",
      "Employee not found in this restaurant.",
    );
  return value;
}
export async function mutateWorkspace(
  transaction: Transaction,
  organizationId: string,
  actorId: string,
  input: { requestId: string; version: number; commands: WorkspaceCommand[] },
): Promise<WorkspaceResult> {
  const payloadHash = createHash("sha256")
    .update(
      JSON.stringify({ version: input.version, commands: input.commands }),
    )
    .digest("hex");
  return transaction(async (client) => {
    // Serialize creation and mutations for this organization, including concurrent
    // onboarding before a restaurant row exists. No client-supplied tenant ID.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      organizationId,
    ]);
    let restaurant = (
      await client.query(
        "SELECT id,version FROM restaurants WHERE clerk_org_id=$1 AND deleted_at IS NULL FOR UPDATE",
        [organizationId],
      )
    ).rows[0];
    if (restaurant) {
      const request = (
        await client.query(
          "SELECT payload_hash FROM mutation_requests WHERE restaurant_id=$1 AND request_id=$2",
          [restaurant.id, input.requestId],
        )
      ).rows[0];
      if (request) {
        if (request.payload_hash !== payloadHash)
          throw new HttpError(
            409,
            "idempotency_conflict",
            "This request reference was already used for another change.",
          );
        return readWorkspace(client, organizationId);
      }
      if (Number(restaurant.version) !== input.version)
        throw new HttpError(
          409,
          "version_conflict",
          "Your workspace changed in another session. Refresh and try again.",
        );
    } else {
      const first = input.commands[0];
      if (
        input.version !== 0 ||
        input.commands.length !== 1 ||
        first.type !== "restaurant.save"
      )
        throw new HttpError(
          409,
          "setup_required",
          "Set up your restaurant before making changes.",
        );
      const restaurantId = randomUUID();
      const prefix =
        first.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 50) || "restaurant";
      restaurant = (
        await client.query(
          "INSERT INTO restaurants(id,clerk_org_id,name,slug,email,city) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,version",
          [
            restaurantId,
            organizationId,
            first.name,
            `${prefix}-${restaurantId.slice(0, 8)}`,
            first.email,
            first.city,
          ],
        )
      ).rows[0];
    }
    for (const command of input.commands) {
      const restaurantId = restaurant.id;
      switch (command.type) {
        case "restaurant.save":
          await client.query(
            "UPDATE restaurants SET name=$1,email=$2,city=$3 WHERE id=$4",
            [command.name, command.email, command.city, restaurantId],
          );
          break;
        case "employee.create":
          await client.query(
            "INSERT INTO employees(id,restaurant_id,name,role,bio,color,visible) VALUES($1,$2,$3,$4,$5,$6,true)",
            [
              command.id,
              restaurantId,
              command.name,
              command.role,
              command.bio,
              command.color,
            ],
          );
          break;
        case "employee.update":
          await employee(client, command.id, restaurantId);
          await client.query(
            "UPDATE employees SET name=$1,role=$2,bio=$3,color=$4 WHERE id=$5 AND restaurant_id=$6",
            [
              command.name,
              command.role,
              command.bio,
              command.color,
              command.id,
              restaurantId,
            ],
          );
          break;
        case "employee.archive":
          await employee(client, command.id, restaurantId);
          await client.query(
            "UPDATE employees SET deleted_at=now(),visible=false WHERE id=$1 AND restaurant_id=$2",
            [command.id, restaurantId],
          );
          await client.query(
            "UPDATE tags SET suspended_at=now() WHERE employee_id=$1 AND restaurant_id=$2 AND deleted_at IS NULL",
            [command.id, restaurantId],
          );
          break;
        case "employee.restore":
          await employee(client, command.id, restaurantId);
          await client.query(
            "UPDATE employees SET deleted_at=NULL,visible=true WHERE id=$1 AND restaurant_id=$2",
            [command.id, restaurantId],
          );
          break;
        case "tag.create": {
          const staff = await employee(
            client,
            command.employeeId,
            restaurantId,
          );
          if (staff.deleted_at)
            throw new HttpError(
              409,
              "employee_archived",
              "Restore the employee before creating a tag.",
            );
          await client.query(
            "INSERT INTO tags(code,restaurant_id,employee_id,format) VALUES($1,$2,$3,$4)",
            [command.code, restaurantId, command.employeeId, command.format],
          );
          break;
        }
        case "tag.status": {
          const tag = (
            await client.query(
              "SELECT employee_id,deleted_at FROM tags WHERE code=$1 AND restaurant_id=$2 FOR UPDATE",
              [command.code, restaurantId],
            )
          ).rows[0];
          if (!tag || tag.deleted_at)
            throw new HttpError(
              404,
              "tag_not_found",
              "Active tag record not found in this restaurant.",
            );
          const staff = await employee(
            client,
            String(tag.employee_id),
            restaurantId,
          );
          if (command.status === "active" && staff.deleted_at)
            throw new HttpError(
              409,
              "employee_archived",
              "An archived employee cannot receive tips.",
            );
          await client.query(
            "UPDATE tags SET suspended_at=CASE WHEN $1='active' THEN NULL ELSE now() END,deleted_at=CASE WHEN $1='deleted' THEN now() ELSE NULL END WHERE code=$2 AND restaurant_id=$3",
            [command.status, command.code, restaurantId],
          );
          break;
        }
        case "order.create":
          await client.query(
            "INSERT INTO hardware_orders(id,restaurant_id,product,quantity,amount_cents,status) VALUES($1,$2,$3,$4,$5,'draft')",
            [
              command.id,
              restaurantId,
              command.product,
              command.quantity,
              catalog[command.product] * command.quantity,
            ],
          );
          break;
      }
      await client.query(
        "INSERT INTO audit_events(restaurant_id,actor_id,action,target_id) VALUES($1,$2,$3,$4)",
        [
          restaurantId,
          actorId,
          command.type,
          "id" in command
            ? command.id
            : "code" in command
              ? command.code
              : String(restaurantId),
        ],
      );
    }
    await client.query("UPDATE restaurants SET version=version+1 WHERE id=$1", [
      restaurant.id,
    ]);
    await client.query(
      "INSERT INTO mutation_requests(restaurant_id,request_id,payload_hash) VALUES($1,$2,$3)",
      [restaurant.id, input.requestId, payloadHash],
    );
    return readWorkspace(client, organizationId);
  });
}
export async function readPublicProfile(
  client: SQLClient,
  lookup: { code?: string; slug?: string; employeeId?: string },
): Promise<DemoState | null> {
  const params = lookup.code ? [lookup.code] : [lookup.slug, lookup.employeeId];
  const row = (
    await client.query(
      `SELECT r.name restaurant_name,r.slug,r.city,e.id,e.name,e.role,e.bio,e.color,t.code,t.format,
 (SELECT count(*)::int FROM tips p WHERE p.employee_id=e.id AND p.restaurant_id=r.id AND p.status='paid' AND p.processing_mode='live' AND p.rating IS NOT NULL AND p.deleted_at IS NULL) rating_count,
 (SELECT avg(rating)::float FROM tips p WHERE p.employee_id=e.id AND p.restaurant_id=r.id AND p.status='paid' AND p.processing_mode='live' AND p.rating IS NOT NULL AND p.deleted_at IS NULL) rating_average
 FROM employees e JOIN restaurants r ON r.id=e.restaurant_id
 ${lookup.code ? "JOIN tags t ON t.employee_id=e.id AND t.restaurant_id=r.id" : "LEFT JOIN tags t ON false"}
 WHERE ${lookup.code ? "t.code=$1 AND t.deleted_at IS NULL AND t.suspended_at IS NULL" : "r.slug=$1 AND e.id=$2"} AND e.deleted_at IS NULL AND e.visible=true AND r.deleted_at IS NULL LIMIT 1`,
      params,
    )
  ).rows[0];
  if (!row) return null;
  return {
    restaurant: {
      name: String(row.restaurant_name),
      slug: String(row.slug),
      city: String(row.city),
      email: "",
    },
    employees: [
      {
        id: String(row.id),
        name: String(row.name),
        role: String(row.role),
        bio: String(row.bio),
        color: String(row.color),
        deletedAt: null,
        ratingSummary: {
          count: Number(row.rating_count),
          average: Number(row.rating_average || 0),
        },
      },
    ],
    tags: row.code
      ? [
          {
            id: String(row.code),
            employeeId: String(row.id),
            type: row.format as "NFC card" | "QR stand",
            status: "active",
          },
        ]
      : [],
    tips: [],
    orders: [],
    plan: "",
    onboarded: true,
  };
}
