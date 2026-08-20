"use client";

import { useActionState, useState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { toDisplay, type WeightUnit } from "@/lib/weight-unit";
import { saveBmi, saveCalorieRequirement, type FormState } from "./actions";

const ACTIVITY = {
  sedentary: { label: "Sedentary (little exercise)", multiplier: 1.2 },
  light: { label: "Lightly active (1-3 days/week)", multiplier: 1.375 },
  moderate: { label: "Moderately active (3-5 days/week)", multiplier: 1.55 },
  very: { label: "Very active (6-7 days/week)", multiplier: 1.725 },
  extra: { label: "Extra active (physical job or intense training)", multiplier: 1.9 },
} as const;

function weightInKg(weight: number, unit: WeightUnit) {
  return unit === "lbs" ? weight / 2.2046226218 : weight;
}

export default function HealthCalculators({ weightKg, weightUnit }: { weightKg: number | null; weightUnit: WeightUnit }) {
  const [bmi, setBmi] = useState<number | null>(null);
  const [calories, setCalories] = useState<number | null>(null);
  const [bmiState, bmiAction] = useActionState<FormState, FormData>(saveBmi, {});
  const [calorieState, calorieAction] = useActionState<FormState, FormData>(saveCalorieRequirement, {});
  const defaultWeight = weightKg === null ? "" : toDisplay(weightKg, weightUnit).toFixed(1);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <h3 className="font-display text-sm font-semibold tracking-tight">BMI calculator</h3>
        <p className="mt-1 text-xs text-muted">Your last saved result appears on Home.</p>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            const weight = Number(fields.get("weight"));
            const heightCm = Number(fields.get("heightCm"));
            if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(heightCm) || heightCm <= 0) return;
            setBmi(weightInKg(weight, weightUnit) / (heightCm / 100) ** 2);
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <Field label={`Weight (${weightUnit})`}><Input name="weight" type="number" min={1} step="0.1" required defaultValue={defaultWeight} /></Field>
            <Field label="Height (cm)"><Input name="heightCm" type="number" min={1} required placeholder="e.g. 175" /></Field>
          </div>
          <p className="text-sm font-medium">{bmi === null ? "Enter values to calculate" : `BMI: ${bmi.toFixed(1)}`}</p>
          <Button type="submit" variant="primary">Calculate BMI</Button>
        </form>
        {bmi !== null && (
          <form action={bmiAction} className="mt-3 flex items-center gap-2">
            <input type="hidden" name="bmi" value={bmi.toFixed(1)} />
            <Button type="submit">Save BMI</Button>
          </form>
        )}
        {bmiState.error && <p role="alert" className="mt-2 text-xs text-warn">{bmiState.error}</p>}
        {bmiState.ok && <p className="mt-2 text-xs text-done">BMI saved.</p>}
      </Card>

      <Card className="p-4">
        <h3 className="font-display text-sm font-semibold tracking-tight">Calorie requirement</h3>
        <p className="mt-1 text-xs text-muted">Uses Mifflin-St Jeor and your selected activity level. Saving also sets your daily calorie goal.</p>
        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            const weight = Number(fields.get("weight"));
            const heightCm = Number(fields.get("heightCm"));
            const age = Number(fields.get("age"));
            const sex = String(fields.get("sex"));
            const activity = String(fields.get("activity")) as keyof typeof ACTIVITY;
            if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(heightCm) || heightCm <= 0 || !Number.isFinite(age) || age <= 0) return;
            const bmr = 10 * weightInKg(weight, weightUnit) + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
            setCalories(Math.round(bmr * ACTIVITY[activity].multiplier));
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <Field label={`Weight (${weightUnit})`}><Input name="weight" type="number" min={1} step="0.1" required defaultValue={defaultWeight} /></Field>
            <Field label="Height (cm)"><Input name="heightCm" type="number" min={1} required /></Field>
            <Field label="Age"><Input name="age" type="number" min={1} required /></Field>
            <Field label="Sex"><Select name="sex" defaultValue="male"><option value="male">Male</option><option value="female">Female</option></Select></Field>
          </div>
          <Field label="Activity level"><Select name="activity" defaultValue="moderate">{Object.entries(ACTIVITY).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}</Select></Field>
          <p className="text-sm font-medium">{calories === null ? "Enter values to calculate" : `${calories.toLocaleString()} calories / day`}</p>
          <Button type="submit" variant="primary">Calculate requirement</Button>
        </form>
        {calories !== null && (
          <form action={calorieAction} className="mt-3 flex items-center gap-2">
            <input type="hidden" name="calories" value={calories} />
            <Button type="submit">Set as daily goal</Button>
          </form>
        )}
        {calorieState.error && <p role="alert" className="mt-2 text-xs text-warn">{calorieState.error}</p>}
        {calorieState.ok && <p className="mt-2 text-xs text-done">Calorie goal saved.</p>}
      </Card>
    </div>
  );
}
