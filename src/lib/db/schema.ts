import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  uniqueIndex,
  index,
  unique,
  check,
  foreignKey,
  primaryKey,
} from "drizzle-orm/pg-core";
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const deletedAt = () => timestamp("deleted_at", { withTimezone: true });
export const restaurants = pgTable(
  "restaurants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkOrgId: text("clerk_org_id").notNull().unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    email: text("email").notNull(),
    city: text("city").default("").notNull(),
    version: integer("version").default(0).notNull(),
    merchantSecretRef: text("merchant_secret_ref"),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    check(
      "restaurant_name_nonempty",
      sql`length(trim(${t.name})) between 1 and 100`,
    ),
    check("restaurant_version_nonnegative", sql`${t.version} >= 0`),
  ],
);
export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    name: text("name").notNull(),
    role: text("role").notNull(),
    bio: text("bio").default("").notNull(),
    color: text("color").default("#e3eee4").notNull(),
    visible: boolean("visible").default(false).notNull(),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("employees_restaurant_idx").on(t.restaurantId),
    unique("employees_id_restaurant").on(t.id, t.restaurantId),
    check(
      "employee_name_nonempty",
      sql`length(trim(${t.name})) between 1 and 100`,
    ),
    check(
      "employee_role_nonempty",
      sql`length(trim(${t.role})) between 1 and 60`,
    ),
    check("employee_bio_length", sql`length(${t.bio}) <= 240`),
  ],
);
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    employeeId: uuid("employee_id").notNull(),
    format: text("format").notNull(),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("tags_restaurant_idx").on(t.restaurantId),
    foreignKey({
      name: "tags_employee_same_restaurant",
      columns: [t.employeeId, t.restaurantId],
      foreignColumns: [employees.id, employees.restaurantId],
    }),
    check("tag_format_valid", sql`${t.format} in ('NFC card','QR stand')`),
  ],
);
export const tips = pgTable(
  "tips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    employeeId: uuid("employee_id").notNull(),
    amount: integer("amount_cents").notNull(),
    currency: text("currency").default("ZAR").notNull(),
    status: text("status").default("pending").notNull(),
    checkoutId: text("checkout_id").unique(),
    checkoutRedirectUrl: text("checkout_redirect_url"),
    processingMode: text("processing_mode").default("live").notNull(),
    refundedAmount: integer("refunded_amount_cents").default(0).notNull(),
    paymentId: text("payment_id").unique(),
    receiptTokenHash: text("receipt_token_hash").notNull(),
    rating: integer("rating"),
    review: text("review"),
    ratedAt: timestamp("rated_at", { withTimezone: true }),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("tips_restaurant_date_idx").on(t.restaurantId, t.createdAt),
    foreignKey({
      name: "tips_employee_same_restaurant",
      columns: [t.employeeId, t.restaurantId],
      foreignColumns: [employees.id, employees.restaurantId],
    }),
    check("tip_amount_bounds", sql`${t.amount} between 500 and 1000000`),
    check("tip_processing_mode", sql`${t.processingMode} in ('test','live')`),
    check(
      "tip_refund_bounds",
      sql`${t.refundedAmount} between 0 and ${t.amount}`,
    ),
    check("tip_currency_zar", sql`${t.currency} = 'ZAR'`),
    check(
      "tip_status_valid",
      sql`${t.status} in ('pending','paid','failed','refunded','cancelled')`,
    ),
    check(
      "tip_rating_bounds",
      sql`${t.rating} is null or ${t.rating} between 1 and 5`,
    ),
    check(
      "tip_review_eligibility",
      sql`${t.review} is null or (${t.rating} is not null and char_length(${t.review}) between 1 and 1000)`,
    ),
    check(
      "tip_rating_eligibility",
      sql`${t.rating} is null or (${t.status} in ('paid','refunded') and ${t.ratedAt} is not null)`,
    ),
  ],
);
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    type: text("type").notNull(),
    resourceId: text("resource_id"),
    processedAt: createdAt(),
  },
  (t) => [
    unique("webhook_resource_once").on(t.restaurantId, t.type, t.resourceId),
  ],
);
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    providerReference: text("provider_reference").unique(),
    status: text("status").notNull(),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    uniqueIndex("subscription_restaurant_idx").on(t.restaurantId),
    check(
      "subscription_status_valid",
      sql`${t.status} in ('trialing','active','past_due','cancelled','inactive')`,
    ),
  ],
);
export const hardwareOrders = pgTable(
  "hardware_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    product: text("product").notNull(),
    quantity: integer("quantity").notNull(),
    amount: integer("amount_cents").notNull(),
    status: text("status").default("draft").notNull(),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index("orders_restaurant_idx").on(t.restaurantId),
    check("order_quantity_positive", sql`${t.quantity} between 1 and 100`),
    check("order_amount_nonnegative", sql`${t.amount} >= 0`),
    check(
      "order_status_valid",
      sql`${t.status} in ('draft','pending','paid','fulfilled','cancelled','refunded')`,
    ),
  ],
);
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    targetId: text("target_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_restaurant_date_idx").on(t.restaurantId, t.createdAt)],
);
export const mutationRequests = pgTable(
  "mutation_requests",
  {
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    requestId: uuid("request_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.restaurantId, t.requestId] })],
);
