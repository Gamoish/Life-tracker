CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lbs');--> statement-breakpoint
ALTER TABLE "water_logs" DROP CONSTRAINT "water_logs_date_key";--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "bottle_size_ml" integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "daily_water_goal_ml" integer DEFAULT 2500 NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "weight_unit" "weight_unit" DEFAULT 'kg' NOT NULL;--> statement-breakpoint
ALTER TABLE "water_logs" ADD COLUMN "amount_ml" integer;