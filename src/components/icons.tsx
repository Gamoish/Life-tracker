/**
 * Small monochrome glyphs — decoration on StatTiles/EmptyStates, never the
 * sole signal (a number or a label always carries the actual meaning).
 * `currentColor` throughout, same reasoning as `nav-items.tsx`: no icon
 * package for a dozen glyphs, and every one inherits its tone from the text
 * color already set by the caller.
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

export function IconSteps({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <ellipse cx="9" cy="9.5" rx="3.2" ry="5" transform="rotate(-16 9 9.5)" />
      <ellipse cx="16" cy="15.5" rx="3.2" ry="5" transform="rotate(-16 16 15.5)" />
    </svg>
  );
}

export function IconDroplet({
  className = "h-4 w-4",
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      {...stroke}
      className={className}
      fill={filled ? "currentColor" : "none"}
    >
      <path d="M12 3.5c3 4 6 8.3 6 11.5a6 6 0 1 1-12 0c0-3.2 3-7.5 6-11.5Z" />
    </svg>
  );
}

export function IconMoon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />
    </svg>
  );
}

export function IconScale({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Same path as `StreakBadge`'s flame in `ui.tsx` — kept in sync by hand. */
export function IconFlame({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2s5 5 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.3-3.8C8.9 9.7 9.7 11 11 11c0-3 1-6 1-9Z" />
    </svg>
  );
}

/** Same paths as `nav-items.tsx`'s IconTarget — kept in sync by hand. */
export function IconTarget({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

/** Same paths as `nav-items.tsx`'s IconRepeat — kept in sync by hand. */
export function IconRepeat({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M4 9a4 4 0 0 1 4-4h9M17 3l3 2.6L17 8" />
      <path d="M20 15a4 4 0 0 1-4 4H7M7 21l-3-2.6L7 16" />
    </svg>
  );
}

/** A circled plus — the universal "nothing here yet, add one" glyph. */
export function IconAdd({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

/** Same paths as `nav-items.tsx`'s IconExpense — kept in sync by hand. */
export function IconWallet({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="17" cy="14.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function IconJournal({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H18a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 18 21H6.5A1.5 1.5 0 0 1 5 19.5v-15Z" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </svg>
  );
}

export function IconBill({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M6 3h12v18l-2.5-1.6L13 21l-1.5-1.6L10 21l-2.5-1.6L6 21V3Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

/** A bank/columned building — EMIs and loans. */
export function IconLoan({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M3 10l9-6 9 6" />
      <path d="M4 10h16v9H4z" />
      <path d="M4 19h16M8 13v4M12 13v4M16 13v4" />
    </svg>
  );
}

/** A coin dropping into a jar — savings goals. */
export function IconPiggyBank({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg {...stroke} className={className}>
      <path d="M4.5 12.5a6.5 6.5 0 0 1 6.5-6.5h4a5 5 0 0 1 5 5v.5l2 1-2 1v1a2.5 2.5 0 0 1-2.5 2.5H16v2h-2.5v-2H11a6.5 6.5 0 0 1-6.5-6.5Z" />
      <circle cx="15.5" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
      <path d="M6 13.5 4 16" />
    </svg>
  );
}
