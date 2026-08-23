/**
 * A curated identity palette for habit cards — deliberately NOT a status
 * vocabulary. These eight are purely decorative, so a user picking "rose" for
 * a habit never implies anything about state. Ported as-is from the web
 * app's `src/app/(app)/habits/habit-color.ts`.
 */

export type HabitColor =
  | "accent"
  | "rose"
  | "amber"
  | "green"
  | "teal"
  | "blue"
  | "violet"
  | "pink";

export const HABIT_COLORS: HabitColor[] = [
  "accent",
  "rose",
  "amber",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
];

export function isHabitColor(value: string): value is HabitColor {
  return (HABIT_COLORS as string[]).includes(value);
}

/* Tailwind needs these as literal strings somewhere in source to generate
   them — same lookup-table pattern `ui.tsx` uses for `Tone`. */
export const HABIT_COLOR_TEXT: Record<HabitColor, string> = {
  accent: "text-accent",
  rose: "text-habit-rose",
  amber: "text-habit-amber",
  green: "text-habit-green",
  teal: "text-habit-teal",
  blue: "text-habit-blue",
  violet: "text-habit-violet",
  pink: "text-habit-pink",
};

export const HABIT_COLOR_BG: Record<HabitColor, string> = {
  accent: "bg-accent",
  rose: "bg-habit-rose",
  amber: "bg-habit-amber",
  green: "bg-habit-green",
  teal: "bg-habit-teal",
  blue: "bg-habit-blue",
  violet: "bg-habit-violet",
  pink: "bg-habit-pink",
};

export const HABIT_COLOR_GLOW: Record<HabitColor, string> = {
  accent: "hover:shadow-[0_14px_32px_-14px_rgba(247,138,4,0.5)]",
  rose: "hover:shadow-[0_14px_32px_-14px_rgba(251,113,133,0.5)]",
  amber: "hover:shadow-[0_14px_32px_-14px_rgba(251,191,36,0.5)]",
  green: "hover:shadow-[0_14px_32px_-14px_rgba(74,222,128,0.5)]",
  teal: "hover:shadow-[0_14px_32px_-14px_rgba(45,212,191,0.5)]",
  blue: "hover:shadow-[0_14px_32px_-14px_rgba(96,165,250,0.5)]",
  violet: "hover:shadow-[0_14px_32px_-14px_rgba(167,139,250,0.5)]",
  pink: "hover:shadow-[0_14px_32px_-14px_rgba(244,114,182,0.5)]",
};
