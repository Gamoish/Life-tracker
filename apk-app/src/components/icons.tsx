/**
 * Small monochrome glyphs — `currentColor` throughout, so each one inherits
 * its tone from the text color already set by the caller. Trimmed from the
 * web app's `src/components/icons.tsx` down to what the Habits screen uses.
 */

export type IconProps = { className?: string };

const stroke = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

/** A circled plus — the universal "nothing here yet, add one" glyph. */
export function IconAdd({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

/** Same path as `StreakBadge`'s flame in the web app's `ui.tsx`. */
export function IconFlame({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2s5 5 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.3-3.8C8.9 9.7 9.7 11 11 11c0-3 1-6 1-9Z" />
    </svg>
  );
}
