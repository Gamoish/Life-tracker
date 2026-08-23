import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";

/* ---------------------------------------------------------------------------
 * The shared kit — trimmed to what the Habits screen needs.
 *
 * Ported from the web app's `src/components/ui.tsx`: same tokens, same
 * component shapes. Every colour comes from a semantic token defined in
 * `globals.css`, so nothing here hard-codes a hex value.
 * ------------------------------------------------------------------------ */

export type Tone = "neutral" | "idle" | "wip" | "done" | "warn" | "accent";

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-muted",
  idle: "text-idle",
  wip: "text-wip",
  done: "text-done",
  warn: "text-warn",
  accent: "text-accent",
};

const TONE_SOFT: Record<Tone, string> = {
  neutral: "bg-raised text-muted",
  idle: "bg-idle-soft text-idle",
  wip: "bg-wip-soft text-wip",
  done: "bg-done-soft text-done",
  warn: "bg-warn-soft text-warn",
  accent: "bg-accent-soft text-accent",
};

const TONE_FILL: Record<Tone, string> = {
  neutral: "bg-muted",
  idle: "bg-idle",
  wip: "bg-wip",
  done: "bg-done",
  warn: "bg-warn",
  accent: "bg-accent",
};

/* ---------------------------------------------------------------------------
 * Surfaces
 * ------------------------------------------------------------------------ */

export function Card({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={`rounded-card border border-line bg-gradient-to-b from-raised/60 to-surface shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 md:mb-8">
      <div className="min-w-0">
        {subtitle && (
          <p className="font-mono text-2xs uppercase tracking-[0.14em] text-faint">{subtitle}</p>
        )}
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

export function SectionHeader({
  title,
  right,
  className = "",
}: {
  title: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-2.5 flex items-baseline justify-between gap-3 ${className}`}>
      <h2 className="text-2xs font-semibold uppercase tracking-[0.14em] text-faint">{title}</h2>
      {right && <span className="text-xs text-faint">{right}</span>}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Labels
 * ------------------------------------------------------------------------ */

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-2xs font-medium uppercase tracking-wide ${TONE_SOFT[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** A headline number. Mono, because it's data. */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  className = "",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-gradient-to-b from-raised/60 to-surface px-4 py-3 ${className}`}
    >
      <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-faint">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums leading-none ${TONE_TEXT[tone]}`}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-2xs text-faint">{hint}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Controls
 * ------------------------------------------------------------------------ */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-[background-color,border-color,color,transform,box-shadow] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const BUTTON_VARIANT = {
  primary:
    "bg-accent text-accent-ink shadow-[0_4px_16px_-4px_rgba(247,138,4,0.45)] hover:opacity-90 hover:shadow-[0_6px_22px_-4px_rgba(247,138,4,0.6)]",
  secondary: "border border-line bg-surface text-ink hover:border-line-strong hover:bg-raised",
  ghost: "text-muted hover:bg-raised hover:text-ink",
  danger: "border border-warn/35 bg-warn-soft text-warn hover:border-warn/60",
} as const;

const BUTTON_SIZE = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "w-full px-4 py-2.5 text-sm",
} as const;

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: {
  children: ReactNode;
  variant?: keyof typeof BUTTON_VARIANT;
  size?: keyof typeof BUTTON_SIZE;
  className?: string;
} & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type={type}
      className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** A quiet inline action — "Edit", "Close". Not a Button; it lives in text. */
export function TextButton({
  children,
  tone = "neutral",
  className = "",
  type = "button",
  ...rest
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
} & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type={type}
      className={`rounded text-xs underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-current ${TONE_TEXT[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

const FIELD_BASE =
  "w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink transition-colors placeholder:text-faint hover:border-line-strong focus:border-accent focus:outline-none";

export function Input({ className = "", ...rest }: ComponentPropsWithoutRef<"input">) {
  return <input className={`${FIELD_BASE} ${className}`} {...rest} />;
}

/* ---------------------------------------------------------------------------
 * States
 * ------------------------------------------------------------------------ */

export function EmptyState({
  title,
  hint,
  icon,
  className = "",
}: {
  title: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line px-6 py-10 text-center ${className}`}
    >
      {icon && (
        <span aria-hidden className="mb-1 text-faint [&_svg]:h-7 [&_svg]:w-7">
          {icon}
        </span>
      )}
      <p className="font-display text-sm font-medium text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-raised ${className}`} />;
}

/* ---------------------------------------------------------------------------
 * Bits
 * ------------------------------------------------------------------------ */

/** A tick, sized to its container. Used by every check-off surface. */
export function CheckMark({ className = "h-3 w-3" }: { className?: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden
    >
      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The `<details>` disclosure the "add" form sits in. Summary's text content
 * is exactly the label, matching the web app's convention.
 */
export function Disclosure({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      className={`group rounded-card border border-line bg-surface transition-colors hover:border-line-strong ${className}`}
    >
      <summary className="cursor-pointer list-none px-4 py-3 font-mono text-xs font-medium text-muted transition-colors group-open:text-ink hover:text-ink">
        {label}
      </summary>
      <div className="border-t border-line px-4 py-4">{children}</div>
    </details>
  );
}
