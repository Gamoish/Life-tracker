"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * One reusable dialog for every quick-entry flow (the Today quick-add bar today,
 * and anywhere else a lightweight capture form belongs later). A bottom sheet on
 * phones, a centered card from `sm` up — the same `sheet-up-in`/`backdrop-in`
 * motion the mobile "More" menu already uses.
 *
 * Presentational and self-contained: it owns the backdrop, Escape-to-close,
 * click-away and body-scroll lock, and nothing else. The caller owns `open` and
 * supplies the form as `children`, so one component serves every action rather
 * than each capture growing its own bespoke modal.
 */
export default function Modal({
  open,
  onClose,
  title,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Small glyph beside the title — decoration only. */
  icon?: ReactNode;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // Lock the page behind the sheet so a long form can't scroll the canvas.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Land the caret in the first field so a capture is one keystroke away.
    panelRef.current
      ?.querySelector<HTMLElement>("input, select, textarea")
      ?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="backdrop-in absolute inset-0 cursor-default bg-canvas/70 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-up-in relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-card border border-line bg-gradient-to-b from-raised/80 to-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-[0_-20px_44px_-16px_rgba(0,0,0,0.7)] sm:rounded-card sm:pb-5 sm:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]"
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            {icon && (
              <span aria-hidden className="text-accent [&_svg]:h-5 [&_svg]:w-5">
                {icon}
              </span>
            )}
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
