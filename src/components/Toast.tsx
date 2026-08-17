"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Tone } from "./ui";

/**
 * Lightweight action feedback.
 *
 * The stack is `pointer-events-none` end to end and carries no controls: it can
 * never swallow a tap meant for the page underneath, and there is nothing to
 * dismiss. Toasts confirm what just happened — they are never the only place a
 * result is shown, so missing one costs nothing.
 */

type Toast = { id: number; message: string; tone: Tone };

type Notify = (message: string, tone?: Tone) => void;

const ToastContext = createContext<Notify>(() => {});

/** `const toast = useToast(); toast("Problem deleted");` */
export function useToast(): Notify {
  return useContext(ToastContext);
}

const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-line text-ink",
  idle: "border-line text-muted",
  wip: "border-wip/40 text-wip",
  done: "border-done/40 text-done",
  warn: "border-warn/40 text-warn",
  accent: "border-accent/40 text-accent",
};

const DURATION = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const notify = useCallback<Notify>((message, tone = "neutral") => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);

    timers.current.push(
      setTimeout(
        () => setToasts((current) => current.filter((t) => t.id !== id)),
        DURATION,
      ),
    );
  }, []);

  // Navigating away mid-toast would otherwise leave a timer holding a setState.
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex flex-col items-center gap-2 px-4 md:bottom-6 md:right-6 md:left-auto md:items-end md:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-in max-w-xs rounded-lg border bg-surface px-3.5 py-2 text-xs font-medium shadow-lg shadow-black/10 ${TONE_CLASS[toast.tone]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
