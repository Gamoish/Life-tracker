import { IBM_Plex_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";

/**
 * Three type roles, three faces. `next/font` downloads and self-hosts them at
 * build time, so there's no render-blocking request to Google at runtime and no
 * layout shift.
 *
 * Each exposes a CSS variable that `globals.css` maps onto a Tailwind font
 * token, so components say `font-display` / `font-mono`, never a family name.
 *
 *   display  Space Grotesk  — headings only, used with restraint
 *   sans     IBM Plex Sans  — everything you actually read
 *   mono     JetBrains Mono — every number: counts, streaks, tallies, dates
 *
 * Space Grotesk and JetBrains Mono are variable fonts; IBM Plex Sans isn't on
 * Google Fonts, so it's pinned to the four weights actually used in the app.
 */

export const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--f-display",
  display: "swap",
});

export const sansFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
