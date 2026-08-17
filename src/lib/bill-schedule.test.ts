import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { advanceDueDate } from "./bill-schedule";

describe("advanceDueDate — monthly", () => {
  it("moves forward one month, same day", () => {
    assert.equal(advanceDueDate("2026-03-15", "monthly"), "2026-04-15");
  });

  it("wraps December into January of the next year", () => {
    assert.equal(advanceDueDate("2026-12-10", "monthly"), "2027-01-10");
  });

  it("clamps the 31st into a shorter month", () => {
    assert.equal(advanceDueDate("2026-01-31", "monthly"), "2026-02-28"); // 2026 not a leap year
  });

  it("stays clamped once it's drifted, rather than un-clamping later", () => {
    // Jan 31 -> Feb 28 -> Mar 28 (not back to 31).
    const feb = advanceDueDate("2026-01-31", "monthly");
    assert.equal(advanceDueDate(feb, "monthly"), "2026-03-28");
  });
});

describe("advanceDueDate — yearly", () => {
  it("moves forward one year, same month and day", () => {
    assert.equal(advanceDueDate("2026-05-20", "yearly"), "2027-05-20");
  });

  it("clamps a Feb 29 anchor to Feb 28 in a non-leap year", () => {
    assert.equal(advanceDueDate("2024-02-29", "yearly"), "2025-02-28");
  });
});
