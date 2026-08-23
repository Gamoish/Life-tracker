import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { currentStreak, isScheduledDay, longestStreak, summarize } from "./habit-streak";

/**
 * Run with:  npm run test:unit
 *
 * Ported verbatim from the web app's `src/lib/habit-streak.test.ts` — the
 * streak maths didn't change, only where `today` comes from at runtime (the
 * device's local clock, not a server timezone), which these pure tests never
 * touch since `today` is always passed in explicitly.
 *
 * Dates below are anchored the same way as the original: 2026-08-16 is a
 * Sunday, so its Monday-start week runs 2026-08-10 (Mon) .. 2026-08-16 (Sun),
 * and 2026-08-17 (Mon) opens the next one.
 *
 * The load-bearing rule is that a streak only ever looks at SCHEDULED days —
 * a day outside a habit's schedule is invisible to it (never breaks, never
 * extends), while a scheduled day with no log row is a miss that ends the run.
 */

const DAILY = [1, 2, 3, 4, 5, 6, 7]; // every weekday
const MON_WED_FRI = [1, 3, 5];
const TUESDAY_ONLY = [2];

const TODAY = "2026-08-16"; // Sunday

describe("isScheduledDay", () => {
  it("matches the ISO weekday against the schedule", () => {
    assert.equal(isScheduledDay(MON_WED_FRI, "2026-08-10"), true); // Monday
    assert.equal(isScheduledDay(MON_WED_FRI, "2026-08-11"), false); // Tuesday
    assert.equal(isScheduledDay(MON_WED_FRI, "2026-08-12"), true); // Wednesday
  });
});

describe("currentStreak", () => {
  it("is 0 for a habit scheduled on no days at all, regardless of history", () => {
    assert.equal(currentStreak([], ["2026-08-16"], TODAY), 0);
  });

  it("an unchecked-but-scheduled today does not break the streak", () => {
    // Thu, Fri, Sat done; Sunday (today, daily habit) left unchecked.
    const done = ["2026-08-13", "2026-08-14", "2026-08-15"];
    assert.equal(currentStreak(DAILY, done, TODAY), 3);
  });

  it("today done extends the streak, no shift needed", () => {
    const done = ["2026-08-14", "2026-08-15", "2026-08-16"];
    assert.equal(currentStreak(DAILY, done, TODAY), 3);
  });

  it("a missed SCHEDULED day in the past ends the streak (daily habit)", () => {
    // Yesterday done, two days ago missing, then two older done days.
    const done = ["2026-08-15", "2026-08-13", "2026-08-12"];
    assert.equal(currentStreak(DAILY, done, TODAY), 1);
  });

  it("a non-scheduled day between two scheduled done-days does not break it", () => {
    // Mon/Wed/Fri habit: Mon + Wed done; Tue (not scheduled) has no log at
    // all and must be invisible to the run, not a gap.
    const done = ["2026-08-10", "2026-08-12"]; // Mon, Wed
    // today = Friday 2026-08-14, not yet checked -> counting starts Thursday,
    // which is skipped (not scheduled), landing back on Wednesday.
    assert.equal(currentStreak(MON_WED_FRI, done, "2026-08-14"), 2);
  });

  it("a missed SCHEDULED day (not just a gap) does break it", () => {
    // Mon/Wed/Fri habit: Mon done, Wed MISSED (scheduled, no log), Fri done.
    const done = ["2026-08-10", "2026-08-14"]; // Mon, Fri — Wed absent
    assert.equal(currentStreak(MON_WED_FRI, done, "2026-08-14"), 1);
  });

  it("a habit scheduled on a single weekday streaks correctly week over week", () => {
    // Tuesdays only, three weeks running.
    const done = ["2026-08-04", "2026-08-11", "2026-08-18"];
    assert.equal(currentStreak(TUESDAY_ONLY, done, "2026-08-18"), 3);
  });

  it("a multi-day weekly schedule accumulates across full unbroken weeks", () => {
    // Mon/Wed/Fri, three complete weeks, today is the last Friday.
    const done = [
      "2026-08-03", "2026-08-05", "2026-08-07", // week 1
      "2026-08-10", "2026-08-12", "2026-08-14", // week 2
      "2026-08-17", "2026-08-19", "2026-08-21", // week 3
    ];
    assert.equal(currentStreak(MON_WED_FRI, done, "2026-08-21"), 9);
  });

  it("today outside the schedule does not itself affect the streak", () => {
    // Mon/Wed/Fri habit, "today" is a Tuesday (not due) — the streak reads
    // purely off the most recent scheduled day, Monday.
    const done = ["2026-08-10"]; // Monday done
    assert.equal(currentStreak(MON_WED_FRI, done, "2026-08-11"), 1);
  });
});

describe("longestStreak", () => {
  it("is 0 with no done days, or no scheduled days", () => {
    assert.equal(longestStreak(DAILY, []), 0);
    assert.equal(longestStreak([], ["2026-08-16"]), 0);
  });

  it("a non-scheduled day inside the span does not split the run", () => {
    // Mon/Wed only scheduled; Tuesday between them is outside the schedule.
    const done = ["2026-08-10", "2026-08-12"]; // Mon, Wed
    assert.equal(longestStreak([1, 3], done), 2);
  });

  it("a missed scheduled day inside the span DOES split the run", () => {
    // Mon/Wed/Fri: Mon and Fri done, Wed missed — two isolated runs of 1.
    const done = ["2026-08-10", "2026-08-14"];
    assert.equal(longestStreak(MON_WED_FRI, done), 1);
  });

  it("finds the best run even when it isn't the most recent one", () => {
    // Mon/Wed/Fri: week 1 only Monday done (run of 1), week 2 all three
    // done (run of 3). Longest must be 3, not the trailing run.
    const done = ["2026-08-03", "2026-08-10", "2026-08-12", "2026-08-14"];
    assert.equal(longestStreak(MON_WED_FRI, done), 3);
  });
});

describe("summarize", () => {
  it("reports dueToday false on a non-scheduled day without disturbing the streak", () => {
    const habit = { scheduledDays: MON_WED_FRI };
    const done = ["2026-08-10"]; // Monday
    const summary = summarize(habit, done, "2026-08-11"); // Tuesday

    assert.equal(summary.dueToday, false);
    assert.equal(summary.doneToday, false);
    assert.equal(summary.streak, 1);
  });

  it("reports doneToday and dueToday true together on a checked scheduled day", () => {
    const habit = { scheduledDays: DAILY };
    const done = ["2026-08-16"];
    const summary = summarize(habit, done, TODAY);

    assert.equal(summary.dueToday, true);
    assert.equal(summary.doneToday, true);
    assert.equal(summary.streak, 1);
    assert.equal(summary.longest, 1);
  });
});
