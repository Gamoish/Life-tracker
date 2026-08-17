import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

/**
 * Three type roles, three faces. `next/font` downloads and self-hosts them at
 * build time, so there's no render-blocking request to Google at runtime and no
 * layout shift.
 *
 * Each exposes a CSS variable that `globals.css` maps onto a Tailwind font
 * token, so components say `font-display` / `font-mono`, never a family name.
 *
 *   display  Space Grotesk — headings only, used with restraint
 *   sans     Inter         — everything you actually read
 *   mono     JetBrains Mono — every number: counts, streaks, tallies, dates
 *
 * All three are variable fonts, so one file covers the whole weight range.
 */

export const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--f-display",
  display: "swap",
});

export const sansFont = Inter({
  subsets: ["latin"],
  variable: "--f-sans",
  display: "swap",
});

export const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--f-mono",
  display: "swap",
});

/** Applied to <html> so every token above resolves document-wide. */
export const fontVariables = `${displayFont.variable} ${sansFont.variable} ${monoFont.variable}`;
