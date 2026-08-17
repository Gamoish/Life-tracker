import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatWeight, fromDisplay, kgToLbs, lbsToKg, toDisplay } from "./weight-unit";

describe("kgToLbs / lbsToKg", () => {
  it("round-trips within floating point tolerance", () => {
    const kg = 71.4;
    assert.ok(Math.abs(lbsToKg(kgToLbs(kg)) - kg) < 1e-9);
  });

  it("matches the known conversion factor", () => {
    assert.ok(Math.abs(kgToLbs(1) - 2.20462262) < 1e-6);
  });
});

describe("toDisplay / fromDisplay", () => {
  it("passes kg through unchanged for the kg unit", () => {
    assert.equal(toDisplay(71.4, "kg"), 71.4);
    assert.equal(fromDisplay(71.4, "kg"), 71.4);
  });

  it("converts for lbs in both directions", () => {
    const kg = 70;
    const lbs = toDisplay(kg, "lbs");
    assert.ok(Math.abs(fromDisplay(lbs, "lbs") - kg) < 1e-9);
  });
});

describe("formatWeight", () => {
  it("labels the unit and rounds to one decimal", () => {
    assert.equal(formatWeight(71.44, "kg"), "71.4 kg");
    assert.equal(formatWeight(70, "lbs"), "154.3 lbs");
  });
});
