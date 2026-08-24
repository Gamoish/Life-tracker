import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { fontVariables } from "./fonts";

export const metadata: Metadata = {
  title: "Tracker",
  description: "Personal life tracker",
  // Safari doesn't fully honor the web manifest (src/app/manifest.ts, linked
  // automatically by Next) — these are the separate meta tags it needs for
  // "Add to Home Screen" to open full-screen instead of in a browser tab.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Deliberately no `maximumScale` — pinch-zoom stays available.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#151318" },
    { media: "(prefers-color-scheme: light)", color: "#f3f1ec" },
  ],
};

/**
 * Dark is the default and needs no help: the palette is plain CSS on `:root`
 * and paints with the first frame. Light is opt-in via `data-theme="light"`
 * on `<html>`, which only `localStorage` (not the server) knows about — so
 * this blocking, `beforeInteractive` script sets the attribute ahead of
 * hydration to avoid a dark-then-light flash. `suppressHydrationWarning` is
 * required alongside it: React would otherwise complain that the attribute
 * it rendered doesn't match the DOM the script just mutated.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{if(localStorage.getItem('theme')==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}`}
        </Script>
        <Script id="sw-register" strategy="afterInteractive">
          {`if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js');});}`}
        </Script>
      </head>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
