CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '#e3eee4' NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "employees_id_restaurant" UNIQUE("id","restaurant_id"),
	CONSTRAINT "employee_name_nonempty" CHECK (length(trim("employees"."name")) between 1 and 100),
	CONSTRAINT "employee_role_nonempty" CHECK (length(trim("employees"."role")) between 1 and 60),
	CONSTRAINT "employee_bio_length" CHECK (length("employees"."bio") <= 240)
);
--> statement-breakpoint
CREATE TABLE "hardware_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"product" text NOT NULL,
	"quantity" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "order_quantity_positive" CHECK ("hardware_orders"."quantity" between 1 and 100),
	CONSTRAINT "order_amount_nonnegative" CHECK ("hardware_orders"."amount_cents" >= 0),
	CONSTRAINT "order_status_valid" CHECK ("hardware_orders"."status" in ('draft','pending','paid','fulfilled','cancelled','refunded'))
);
--> statement-breakpoint
CREATE TABLE "mutation_requests" (
	"restaurant_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mutation_requests_restaurant_id_request_id_pk" PRIMARY KEY("restaurant_id","request_id")
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"email" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"merchant_secret_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "restaurants_clerk_org_id_unique" UNIQUE("clerk_org_id"),
	CONSTRAINT "restaurants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "restaurant_name_nonempty" CHECK (length(trim("restaurants"."name")) between 1 and 100),
	CONSTRAINT "restaurant_version_nonnegative" CHECK ("restaurants"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"provider_reference" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "subscriptions_provider_reference_unique" UNIQUE("provider_reference"),
	CONSTRAINT "subscription_status_valid" CHECK ("subscriptions"."status" in ('trialing','active','past_due','cancelled','inactive'))
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"format" text NOT NULL,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tags_code_unique" UNIQUE("code"),
	CONSTRAINT "tag_format_valid" CHECK ("tags"."format" in ('NFC card','QR stand'))
);
--> statement-breakpoint
CREATE TABLE "tips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'ZAR' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"checkout_id" text,
	"payment_id" text,
	"receipt_token_hash" text NOT NULL,
	"rating" integer,
	"rated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "tips_checkout_id_unique" UNIQUE("checkout_id"),
	CONSTRAINT "tips_payment_id_unique" UNIQUE("payment_id"),
	CONSTRAINT "tip_amount_bounds" CHECK ("tips"."amount_cents" between 500 and 1000000),
	CONSTRAINT "tip_currency_zar" CHECK ("tips"."currency" = 'ZAR'),
	CONSTRAINT "tip_status_valid" CHECK ("tips"."status" in ('pending','paid','failed','refunded','cancelled')),
	CONSTRAINT "tip_rating_bounds" CHECK ("tips"."rating" is null or "tips"."rating" between 1 and 5),
	CONSTRAINT "tip_rating_eligibility" CHECK ("tips"."rating" is null or ("tips"."status" in ('paid','refunded') and "tips"."rated_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_orders" ADD CONSTRAINT "hardware_orders_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutation_requests" ADD CONSTRAINT "mutation_requests_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_employee_same_restaurant" FOREIGN KEY ("employee_id","restaurant_id") REFERENCES "public"."employees"("id","restaurant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_employee_same_restaurant" FOREIGN KEY ("employee_id","restaurant_id") REFERENCES "public"."employees"("id","restaurant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_restaurant_date_idx" ON "audit_events" USING btree ("restaurant_id","created_at");--> statement-breakpoint
CREATE INDEX "employees_restaurant_idx" ON "employees" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "orders_restaurant_idx" ON "hardware_orders" USING btree ("restaurant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_restaurant_idx" ON "subscriptions" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "tags_restaurant_idx" ON "tags" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "tips_restaurant_date_idx" ON "tips" USING btree ("restaurant_id","created_at");