/**
 * A curated identity palette for habit cards — deliberately NOT the app's
 * `Tone` system (done/wip/warn/idle carry real meaning everywhere else).
 * These eight are purely decorative, so a user picking "rose" for a habit
 * never implies anything about state.
 *
 * Plain module, no "use client" — so the server-only `actions.ts` can import
 * `isHabitColor` for validation without crossing a client boundary.
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

export const HABIT_COLOR_BORDER: Record<HabitColor, string> = {
  accent: "border-accent",
  rose: "border-habit-rose",
  amber: "border-habit-amber",
  green: "border-habit-green",
  teal: "border-habit-teal",
  blue: "border-habit-blue",
  violet: "border-habit-violet",
  pink: "border-habit-pink",
};

/**
 * Hover glow in the habit's own color — arbitrary-value `shadow-*` utilities
 * need literal rgba() strings (Tailwind can't resolve a CSS var's components
 * for opacity math inside `shadow-[...]`), hand-kept in sync with the hex
 * values in globals.css. A shadow is invisible on true black; a colour glow
 * is how a hovered card reads as "lifted", tinted to that habit specifically.
 */
export const HABIT_COLOR_GLOW: Record<HabitColor, string> = {
  accent: "hover:shadow-[0_14px_32px_-14px_rgba(231,164,75,0.5)]",
  rose: "hover:shadow-[0_14px_32px_-14px_rgba(251,113,133,0.5)]",
  amber: "hover:shadow-[0_14px_32px_-14px_rgba(251,191,36,0.5)]",
  green: "hover:shadow-[0_14px_32px_-14px_rgba(74,222,128,0.5)]",
  teal: "hover:shadow-[0_14px_32px_-14px_rgba(45,212,191,0.5)]",
  blue: "hover:shadow-[0_14px_32px_-14px_rgba(96,165,250,0.5)]",
  violet: "hover:shadow-[0_14px_32px_-14px_rgba(167,139,250,0.5)]",
  pink: "hover:shadow-[0_14px_32px_-14px_rgba(244,114,182,0.5)]",
};
