ALTER TABLE "habits" ADD COLUMN "scheduled_days" integer[];--> statement-breakpoint
-- Backfill from the old cadence model, which still exists at this point in the
-- migration history (dropped one migration later, in 0004).
--   daily  -> every weekday, 1..7.
--   weekly -> N days spread across the week (Mon, Wed, Fri, Sun, Tue, Thu,
--             Sat, in that priority order) since the old model only ever
--             recorded a COUNT, never which specific days were meant.
UPDATE "habits" SET "scheduled_days" = ARRAY[1,2,3,4,5,6,7] WHERE "cadence" = 'daily';--> statement-breakpoint
UPDATE "habits" h
SET "scheduled_days" = (
  SELECT array_agg(day ORDER BY ord)
  FROM unnest(ARRAY[1,3,5,7,2,4,6]) WITH ORDINALITY AS t(day, ord)
  WHERE ord <= GREATEST(1, LEAST(7, COALESCE(h.weekly_target, 3)))
)
WHERE h.cadence = 'weekly';--> statement-breakpoint
ALTER TABLE "habits" ALTER COLUMN "scheduled_days" SET NOT NULL;
