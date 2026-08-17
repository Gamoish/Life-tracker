import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";

export const metadata: Metadata = {
  title: "Tracker",
  description: "Personal life tracker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Deliberately no `maximumScale` — pinch-zoom stays available.
  themeColor: "#000000",
};

/**
 * The app is dark-only, so there is no theme provider and no pre-paint script
 * to guard against: the palette is plain CSS on `:root` and paints with the
 * first frame. `color-scheme: dark` in globals.css is what makes the native
 * controls (scrollbars, date pickers, the range slider) render dark too.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
