import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizeDay, totalCalories, totalWorkoutMinutes } from "./health";

/**
 * Run with:  npm run test:unit
 *
 * The point of these is the null-calorie rule: an entry logged without a
 * number must still LIST but must not move the total, and must never turn it
 * into NaN or null.
 */

describe("totalCalories", () => {
  it("is 0 for an empty day rather than null", () => {
    assert.equal(totalCalories([]), 0);
  });

  it("sums the entries that have a number", () => {
    assert.equal(totalCalories([{ calories: 420 }, { calories: 80 }]), 500);
  });

  it("treats a null-calorie entry as 0", () => {
    assert.equal(totalCalories([{ calories: 420 }, { calories: null }]), 420);
  });

  it("is 0 — not null — when every entry is null", () => {
    assert.equal(totalCalories([{ calories: null }, { calories: null }]), 0);
  });

  it("never produces NaN from a malformed row", () => {
    const rows = [{ calories: 100 }, { calories: undefined as unknown as null }];
    assert.equal(totalCalories(rows), 100);
  });
});

describe("totalWorkoutMinutes", () => {
  it("adds every workout's duration", () => {
    assert.equal(totalWorkoutMinutes([{ durationMin: 45 }, { durationMin: 20 }]), 65);
  });

  it("is 0 with no workouts", () => {
    assert.equal(totalWorkoutMinutes([]), 0);
  });
});

describe("summarizeDay", () => {
  it("rolls the whole day up in one pass", () => {
    const summary = summarizeDay({
      steps: 8200,
      weightKg: 71.4,
      waterMl: 1500,
      food: [{ calories: 300 }, { calories: null }, { calories: 250 }],
      workouts: [{ durationMin: 30 }],
    });

    assert.deepEqual(summary, {
      steps: 8200,
      weightKg: 71.4,
      waterMl: 1500,
      calories: 550,
      workoutMinutes: 30,
      foodCount: 3, // the null-calorie entry still counts as an entry
      workoutCount: 1,
    });
  });

  it("keeps an unlogged metric null instead of reporting a fake 0", () => {
    const summary = summarizeDay({
      steps: null,
      weightKg: null,
      waterMl: 0,
      food: [],
      workouts: [],
    });

    assert.equal(summary.steps, null);
    assert.equal(summary.weightKg, null);
    assert.equal(summary.calories, 0);
  });

  it("floors a negative water total at 0", () => {
    const summary = summarizeDay({
      steps: null,
      weightKg: null,
      waterMl: -1,
      food: [],
      workouts: [],
    });

    assert.equal(summary.waterMl, 0);
  });
});
