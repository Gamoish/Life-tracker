import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDueOn, isOverdue, previousDueDate, type TaskSchedule } from "./task-schedule";

/**
 * Run with:  npm run test:unit
 *
 * Same anchor convention as heatmap.test.ts / habit-streak.test.ts:
 * 2026-08-16 is a Sunday, so its Monday-start week runs 2026-08-10 (Mon) ..
 * 2026-08-16 (Sun).
 */

const TODAY = "2026-08-16";

describe("isDueOn — one_off", () => {
  const task: TaskSchedule = { recurrence: "one_off", dueDate: "2026-08-20", scheduledDays: null };

  it("is due only on its exact date", () => {
    assert.equal(isDueOn(task, "2026-08-20"), true);
    assert.equal(isDueOn(task, "2026-08-19"), false);
    assert.equal(isDueOn(task, "2026-08-21"), false);
  });
});

describe("isDueOn — daily", () => {
  const task: TaskSchedule = { recurrence: "daily", dueDate: "2026-08-10", scheduledDays: null };

  it("is due every day from its anchor onward, never before", () => {
    assert.equal(isDueOn(task, "2026-08-09"), false); // before the task starts
    assert.equal(isDueOn(task, "2026-08-10"), true);
    assert.equal(isDueOn(task, "2026-09-01"), true);
  });
});

describe("isDueOn — weekly", () => {
  const task: TaskSchedule = {
    recurrence: "weekly",
    dueDate: "2026-08-10", // a Monday
    scheduledDays: [1, 3, 5], // Mon, Wed, Fri
  };

  it("is due only on scheduled weekdays, from its anchor onward", () => {
    assert.equal(isDueOn(task, "2026-08-10"), true); // Mon, on anchor
    assert.equal(isDueOn(task, "2026-08-11"), false); // Tue
    assert.equal(isDueOn(task, "2026-08-12"), true); // Wed
    assert.equal(isDueOn(task, "2026-08-03"), false); // a Monday, but before the anchor
  });
});

describe("isDueOn — monthly", () => {
  const task: TaskSchedule = { recurrence: "monthly", dueDate: "2026-01-31", scheduledDays: null };

  it("recurs on the same day-of-month, clamped to shorter months", () => {
    assert.equal(isDueOn(task, "2026-01-31"), true);
    assert.equal(isDueOn(task, "2026-02-28"), true); // Feb 2026 has 28 days: 31 -> 28
    assert.equal(isDueOn(task, "2026-02-27"), false);
    assert.equal(isDueOn(task, "2026-04-30"), true); // April has 30 days: 31 -> 30
    assert.equal(isDueOn(task, "2026-03-31"), true); // March has 31: no clamp needed
  });

  it("is never due before its own anchor, even on a matching day-of-month", () => {
    const later: TaskSchedule = { recurrence: "monthly", dueDate: "2026-06-15", scheduledDays: null };
    assert.equal(isDueOn(later, "2026-05-15"), false);
  });
});

describe("isDueOn — yearly", () => {
  it("recurs on the same month and day every year", () => {
    const task: TaskSchedule = { recurrence: "yearly", dueDate: "2026-05-15", scheduledDays: null };
    assert.equal(isDueOn(task, "2026-05-15"), true);
    assert.equal(isDueOn(task, "2027-05-15"), true);
    assert.equal(isDueOn(task, "2027-05-14"), false);
    assert.equal(isDueOn(task, "2027-03-01"), false);
  });

  it("clamps a Feb 29 anchor to Feb 28 outside leap years", () => {
    const task: TaskSchedule = { recurrence: "yearly", dueDate: "2024-02-29", scheduledDays: null };
    assert.equal(isDueOn(task, "2024-02-29"), true); // leap year: exact match
    assert.equal(isDueOn(task, "2025-02-28"), true); // non-leap: clamped
    assert.equal(isDueOn(task, "2026-02-28"), true); // non-leap: clamped
    assert.equal(isDueOn(task, "2028-02-29"), true); // next leap year: exact again
  });
});

describe("previousDueDate", () => {
  it("finds yesterday for a daily task", () => {
    const task: TaskSchedule = { recurrence: "daily", dueDate: "2026-07-01", scheduledDays: null };
    assert.equal(previousDueDate(task, TODAY), "2026-08-15");
  });

  it("skips back to the last scheduled weekday for a weekly task", () => {
    const task: TaskSchedule = {
      recurrence: "weekly",
      dueDate: "2026-07-01",
      scheduledDays: [1, 3, 5], // Mon, Wed, Fri
    };
    // TODAY is Sunday 2026-08-16; the last Mon/Wed/Fri before it is Fri 08-14.
    assert.equal(previousDueDate(task, TODAY), "2026-08-14");
  });

  it("clamps correctly for a monthly task too", () => {
    const task: TaskSchedule = { recurrence: "monthly", dueDate: "2026-01-31", scheduledDays: null };
    // Previous occurrence before Aug 16 is the (clamped) July 31.
    assert.equal(previousDueDate(task, TODAY), "2026-07-31");
  });

  it("is null when the task has no due occurrence before today", () => {
    const task: TaskSchedule = { recurrence: "daily", dueDate: TODAY, scheduledDays: null };
    assert.equal(previousDueDate(task, TODAY), null);
  });
});

describe("isOverdue", () => {
  it("is always false for one-off tasks — callers check `completedAt` directly instead", () => {
    const task: TaskSchedule = { recurrence: "one_off", dueDate: "2020-01-01", scheduledDays: null };
    assert.equal(isOverdue(task, [], TODAY), false);
  });

  it("is true when the most recent due occurrence has no completion logged", () => {
    const task: TaskSchedule = { recurrence: "daily", dueDate: "2026-08-01", scheduledDays: null };
    assert.equal(isOverdue(task, [], TODAY), true);
    assert.equal(isOverdue(task, ["2026-08-10"], TODAY), true); // wrong day logged
  });

  it("is false once the most recent due occurrence is logged done", () => {
    const task: TaskSchedule = { recurrence: "daily", dueDate: "2026-08-01", scheduledDays: null };
    assert.equal(isOverdue(task, ["2026-08-15"], TODAY), false); // yesterday, logged
  });

  it("is false when there's no prior occurrence to have missed", () => {
    const task: TaskSchedule = { recurrence: "weekly", dueDate: TODAY, scheduledDays: [7] }; // Sunday, today
    assert.equal(isOverdue(task, [], TODAY), false);
  });
});
