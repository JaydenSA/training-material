ALTER TABLE "webhook_events" ADD COLUMN "resource_id" text;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_resource_once" UNIQUE("restaurant_id","type","resource_id");