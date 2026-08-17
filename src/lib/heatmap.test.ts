import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activityStreak,
  buildHeatmap,
  countByDate,
  heatLevel,
} from "./heatmap";

/**
 * Run with:  npm run test:unit
 *
 * The load-bearing rules here are the window's edges — the grid must END on
 * today (never render a future cell as "missed") and START on a Monday — and
 * the relative ramp, which must not paint a quiet week at full intensity.
 */

// 2026-08-16 is a Sunday, so its Monday-start week begins 2026-08-10.
const TODAY = "2026-08-16";

describe("countByDate", () => {
  it("stacks repeats on the same day", () => {
    const counts = countByDate(["2026-08-10", "2026-08-10", "2026-08-11"]);
    assert.equal(counts.get("2026-08-10"), 2);
    assert.equal(counts.get("2026-08-11"), 1);
  });

  it("truncates a timestamp to its date", () => {
    const counts = countByDate(["2026-08-10T18:30:00.000Z"]);
    assert.equal(counts.get("2026-08-10"), 1);
  });

  it("is empty for no events, rather than throwing", () => {
    assert.equal(countByDate([]).size, 0);
  });
});

describe("heatLevel", () => {
  it("is 0 for a day with nothing on it", () => {
    assert.equal(heatLevel(0, 8), 0);
  });

  it("never paints a quiet window at full intensity", () => {
    // Busiest day in the window is a single event: that's level 1, not 4.
    assert.equal(heatLevel(1, 1), 1);
    assert.equal(heatLevel(2, 2), 2);
  });

  it("spreads across the ramp once the window has range", () => {
    assert.equal(heatLevel(1, 8), 1);
    assert.equal(heatLevel(4, 8), 2);
    assert.equal(heatLevel(6, 8), 3);
    assert.equal(heatLevel(8, 8), 4);
  });

  it("clamps a count above the max to 4", () => {
    assert.equal(heatLevel(99, 8), 4);
  });
});

describe("buildHeatmap", () => {
  it("starts on a Monday and ends on today", () => {
    const grid = buildHeatmap([], TODAY, 4);
    assert.equal(grid.weeks.length, 4);
    assert.equal(grid.start, "2026-07-20"); // Monday, 3 weeks before
    assert.equal(grid.weeks[0].start, "2026-07-20");
    assert.equal(grid.end, TODAY);
  });

  it("gives every column exactly seven slots", () => {
    const grid = buildHeatmap([], TODAY, 6);
    for (const week of grid.weeks) assert.equal(week.days.length, 7);
  });

  it("leaves days after today null instead of rendering them as missed", () => {
    // Wednesday, so Thu–Sun of the final column are still to come.
    const grid = buildHeatmap([], "2026-08-12", 2);
    const last = grid.weeks[grid.weeks.length - 1].days;

    assert.equal(last[0]?.date, "2026-08-10"); // Monday
    assert.equal(last[2]?.date, "2026-08-12"); // today
    assert.equal(last[3], null);
    assert.equal(last[6], null);
  });

  it("places counted days on the right cell", () => {
    const grid = buildHeatmap(["2026-08-10", "2026-08-10", "2026-08-14"], TODAY, 2);
    const last = grid.weeks[1].days;

    assert.equal(last[0]?.count, 2); // Monday
    assert.equal(last[1]?.count, 0);
    assert.equal(last[4]?.count, 1); // Friday
  });

  it("summarises only what's inside the window", () => {
    const grid = buildHeatmap(
      ["2020-01-01", "2026-08-10", "2026-08-10", "2026-08-14"],
      TODAY,
      2,
    );

    assert.equal(grid.total, 3); // the 2020 event is outside the window
    assert.equal(grid.activeDays, 2);
    assert.equal(grid.max, 2);
    assert.equal(grid.busiestDate, "2026-08-10");
  });

  it("reports an empty window as zeroes, not nulls", () => {
    const grid = buildHeatmap([], TODAY, 3);
    assert.equal(grid.total, 0);
    assert.equal(grid.activeDays, 0);
    assert.equal(grid.max, 0);
    assert.equal(grid.busiestDate, null);
  });

  it("levels every cell relative to the window's peak", () => {
    const dates = [
      ...Array(8).fill("2026-08-10"),
      "2026-08-11",
      "2026-08-12",
      "2026-08-12",
      "2026-08-12",
      "2026-08-12",
    ];
    const days = buildHeatmap(dates, TODAY, 1).weeks[0].days;

    assert.equal(days[0]?.level, 4); // 8 of 8
    assert.equal(days[1]?.level, 1); // 1 of 8
    assert.equal(days[2]?.level, 2); // 4 of 8
    assert.equal(days[3]?.level, 0); // nothing logged
  });

  it("labels months without jamming two abbreviations together", () => {
    const grid = buildHeatmap([], TODAY, 12);
    const indexes = grid.months.map((m) => m.index);

    assert.ok(grid.months.length > 0);
    assert.deepEqual([...indexes].sort((a, b) => a - b), indexes);
    for (let i = 1; i < indexes.length; i++) {
      assert.ok(indexes[i] - indexes[i - 1] >= 2);
    }
  });

  it("clamps a nonsensical week count to one column", () => {
    assert.equal(buildHeatmap([], TODAY, 0).weeks.length, 1);
    assert.equal(buildHeatmap([], TODAY, -5).weeks.length, 1);
  });
});

describe("activityStreak", () => {
  it("counts consecutive days ending today", () => {
    assert.equal(
      activityStreak(["2026-08-16", "2026-08-15", "2026-08-14"], TODAY),
      3,
    );
  });

  it("does not let an empty today break the run", () => {
    assert.equal(activityStreak(["2026-08-15", "2026-08-14"], TODAY), 2);
  });

  it("ends the run at a missed past day", () => {
    assert.equal(
      activityStreak(["2026-08-15", "2026-08-13", "2026-08-12"], TODAY),
      1,
    );
  });

  it("is 0 with no activity at all", () => {
    assert.equal(activityStreak([], TODAY), 0);
  });
});
