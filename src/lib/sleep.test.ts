import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeSleepDuration, formatDuration } from "./sleep";

describe("computeSleepDuration", () => {
  it("handles the ordinary case: bed at night, wake the next morning", () => {
    assert.equal(computeSleepDuration("23:00", "07:00"), 8 * 60);
    assert.equal(computeSleepDuration("22:30", "06:15"), 7 * 60 + 45);
  });

  it("handles a same-day nap: wake later in the same clock", () => {
    assert.equal(computeSleepDuration("14:00", "15:30"), 90);
  });

  it("handles bed right before midnight", () => {
    assert.equal(computeSleepDuration("23:59", "00:01"), 2);
  });

  it("treats an identical bed and wake time as a full 24 hours", () => {
    assert.equal(computeSleepDuration("23:00", "23:00"), 24 * 60);
  });
});

describe("formatDuration", () => {
  it("shows hours and minutes together", () => {
    assert.equal(formatDuration(7 * 60 + 30), "7h 30m");
  });

  it("omits minutes when there are none", () => {
    assert.equal(formatDuration(8 * 60), "8h");
  });

  it("omits hours when there are none", () => {
    assert.equal(formatDuration(45), "45m");
  });
});
