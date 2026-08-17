-- Water is one row per day, incremented by tapping. Any rows written before
-- this constraint existed could have duplicated a date, and ADD CONSTRAINT
-- would then fail outright — so collapse each day into a single row first,
-- keeping the SUM of its glasses rather than silently discarding taps.
UPDATE "water_logs" w
SET "glasses" = t."total"
FROM (
  SELECT "date", SUM("glasses")::int AS "total", MIN("id") AS "keep"
  FROM "water_logs"
  GROUP BY "date"
) t
WHERE w."id" = t."keep" AND w."glasses" <> t."total";
--> statement-breakpoint
DELETE FROM "water_logs" w
WHERE w."id" <> (SELECT MIN(x."id") FROM "water_logs" x WHERE x."date" = w."date");
--> statement-breakpoint
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_date_key" UNIQUE("date");
