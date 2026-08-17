"use client";

import { useState } from "react";
import { CheckMark } from "@/components/ui";
import { HABIT_COLORS, HABIT_COLOR_BG, type HabitColor } from "./habit-color";

/** A row of swatches, single-select, submitting as a hidden `color` input. */
export default function ColorPicker({
  name = "color",
  defaultValue = "accent",
  ariaLabel = "Habit color",
}: {
  name?: string;
  defaultValue?: HabitColor;
  ariaLabel?: string;
}) {
  const [selected, setSelected] = useState<HabitColor>(defaultValue);

  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={selected} />
      {HABIT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={selected === c}
          aria-label={c}
          data-testid={`color-${c}`}
          onClick={() => setSelected(c)}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${HABIT_COLOR_BG[c]} ${
            selected === c ? "scale-110" : "opacity-70 hover:scale-105 hover:opacity-100"
          }`}
        >
          {selected === c && <CheckMark className="h-3.5 w-3.5 text-canvas" />}
        </button>
      ))}
    </div>
  );
}
