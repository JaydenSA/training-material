ALTER TABLE "tips" ADD COLUMN "checkout_redirect_url" text;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "processing_mode" text DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE "tips" ADD COLUMN "refunded_amount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tip_processing_mode" CHECK ("tips"."processing_mode" in ('test','live'));--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tip_refund_bounds" CHECK ("tips"."refunded_amount_cents" between 0 and "tips"."amount_cents");