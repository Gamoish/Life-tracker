"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./icons";
import { getStoredTheme, toggleTheme, type Theme } from "@/lib/theme-client";

/**
 * Renders wherever the design puts a theme switch (sidebar footer, Settings).
 * Starts assuming "dark" — matches the server-rendered markup, since the
 * actual stored theme only exists in `localStorage` — then syncs to the real
 * value on mount. The pre-paint script in `app/layout.tsx` already applied
 * the correct `data-theme` attribute before this ever renders, so there's no
 * visible flash; this only corrects the icon/label a frame later.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  return (
    <button
      type="button"
      onClick={() => setTheme(toggleTheme())}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 font-mono text-xs text-muted transition-colors hover:border-accent/50 hover:text-ink active:scale-95 ${className}`}
    >
      <span key={theme} className="pop-in inline-flex">
        {theme === "dark" ? <IconSun /> : <IconMoon />}
      </span>
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
