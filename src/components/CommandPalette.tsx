"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DESTINATIONS } from "./nav-items";
import { toggleTheme } from "@/lib/theme-client";

const OPEN_EVENT = "cmdk:open";

/** Sidebar's "Search or jump…" button — opens the palette mounted in `AppLayout`. */
export function CommandPaletteButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="mx-3 mb-2.5 flex items-center gap-2.5 rounded-lg border border-line-strong bg-raised px-3 py-2 text-left text-sm text-faint transition-colors hover:border-accent/40 hover:text-muted"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="flex-1 truncate">Search or jump…</span>
      <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-2xs">⌘K</kbd>
    </button>
  );
}

type Command = { label: string; hint: string; run: () => void };

/**
 * Global ⌘K/Ctrl+K palette — mounted once in `AppLayout` so the shortcut and
 * the sidebar's trigger both reach the same instance. Scope is deliberately
 * "jump to a screen" plus a couple of app-wide actions, not a mirror of every
 * module's own mutations — those already have their own forms.
 */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const jumps: Command[] = [
      ...DESTINATIONS.map((d) => ({
        label: `Go to ${d.label}`,
        hint: "Screen",
        run: () => router.push(d.href),
      })),
      { label: "Go to Journal", hint: "Screen", run: () => router.push("/journal") },
      { label: "Go to Settings", hint: "Screen", run: () => router.push("/settings") },
    ];
    return [...jumps, { label: "Toggle theme", hint: "Action", run: () => toggleTheme() }];
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setIndex(0);
  };

  const runCommand = (cmd: Command) => {
    cmd.run();
    close();
  };

  useEffect(() => {
    function onOpenEvent() {
      setOpen(true);
    }
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        close();
      }
    }
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <div
      onClick={close}
      className="fixed inset-0 z-[95] flex items-start justify-center bg-black/50 px-5 pb-5"
      style={{ paddingTop: "12vh" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_18px_48px_-12px_rgba(0,0,0,0.55)]"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-faint" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && filtered[index]) {
                e.preventDefault();
                runCommand(filtered[index]);
              }
            }}
            placeholder="Search screens and actions…"
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-faint">esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">No matches</p>
          ) : (
            filtered.map((cmd, i) => (
              <div
                key={cmd.label}
                onMouseEnter={() => setIndex(i)}
                onClick={() => runCommand(cmd)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  i === index ? "bg-raised text-ink" : "text-muted"
                }`}
              >
                <span>{cmd.label}</span>
                <span className="font-mono text-2xs uppercase tracking-wide text-faint">{cmd.hint}</span>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-4 border-t border-line px-4 py-2.5 font-mono text-2xs text-faint">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
