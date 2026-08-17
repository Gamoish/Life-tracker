CREATE TYPE "public"."goal_term" AS ENUM('short', 'long');--> statement-breakpoint
-- DEFAULT backfills every existing row in the same statement (Postgres applies
-- it in place rather than rewriting the table), then gets dropped so future
-- inserts must supply a real value — same two-step shape as the habits
-- scheduled_days backfill in 0003/0004.
ALTER TABLE "goals" ADD COLUMN "category" text NOT NULL DEFAULT 'General';--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "term" "goal_term" NOT NULL DEFAULT 'short';--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "category" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "goals" ALTER COLUMN "term" DROP DEFAULT;
