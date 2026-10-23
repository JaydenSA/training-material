ALTER TABLE "tips" ADD CONSTRAINT "tips_restaurant_id_unique" UNIQUE("restaurant_id","id");
--> statement-breakpoint
CREATE TABLE "review_moderations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sequence" bigserial NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"tip_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"actor_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_action_valid" CHECK ("review_moderations"."action" in ('flag','hide','restore')),
	CONSTRAINT "moderation_reason_valid" CHECK (char_length(trim("review_moderations"."reason")) between 5 and 500)
);
--> statement-breakpoint
ALTER TABLE "review_moderations" ADD CONSTRAINT "review_moderations_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_moderations" ADD CONSTRAINT "moderation_tip_same_restaurant" FOREIGN KEY ("restaurant_id","tip_id") REFERENCES "public"."tips"("restaurant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_tip_sequence_idx" ON "review_moderations" USING btree ("restaurant_id","tip_id","sequence");
