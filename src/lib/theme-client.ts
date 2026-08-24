"use client";

/**
 * Client-only theme read/write, shared by `ThemeToggle` and `CommandPalette`
 * so there's exactly one place that knows the storage key and the attribute
 * name. The inline script in `app/layout.tsx` applies the stored theme before
 * paint using the same key — keep the two in sync if this changes.
 */

export type Theme = "dark" | "light";

const STORAGE_KEY = "theme";

export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme === "light" ? "light" : "";
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing / storage disabled — the attribute still updates for
    // this page load, it just won't persist across a reload.
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getStoredTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
