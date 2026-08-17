/**
 * Weight is always stored in kg (`daily_health.weight_kg`) — `kg`/`lbs` is a
 * presentation-layer preference, converted at the input/display boundary
 * only. Pure and DB-free, same shape as `./sleep.ts`.
 */

export type WeightUnit = "kg" | "lbs";

const KG_PER_LB = 0.45359237;

export function kgToLbs(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbsToKg(lbs: number): number {
  return lbs * KG_PER_LB;
}

/** Stored kg -> the value to show/prefill in the user's preferred unit. */
export function toDisplay(kg: number, unit: WeightUnit): number {
  return unit === "lbs" ? kgToLbs(kg) : kg;
}

/** A value typed in the user's preferred unit -> kg, for storage. */
export function fromDisplay(value: number, unit: WeightUnit): number {
  return unit === "lbs" ? lbsToKg(value) : value;
}

/** e.g. "71.4 kg" / "157.5 lbs" — one decimal place, unit-labelled. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${toDisplay(kg, unit).toFixed(1)} ${unit}`;
}
