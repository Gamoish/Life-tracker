-- Water tracking is being redesigned from a glass-counter (one row per day)
-- to an ml-based event log (one row per log tap). Existing rows are an
-- arbitrary glass count with no ml value to convert, so they're cleared
-- rather than left with a fabricated amount.
DELETE FROM "water_logs";--> statement-breakpoint
ALTER TABLE "water_logs" ALTER COLUMN "amount_ml" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "water_logs" DROP COLUMN "glasses";