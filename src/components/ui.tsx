import type {
  ComponentPropsWithoutRef,
  ReactElement,
  ReactNode,
} from "react";

/* ---------------------------------------------------------------------------
 * The shared kit.
 *
 * Every colour in here comes from a semantic token in `globals.css`, so both
 * themes work with zero per-component overrides. If you find yourself reaching
 * for a literal hex or a Tailwind palette colour (`bg-slate-800`), the token is
 * missing — add it there instead of hard-coding it here.
 *
 * Nothing in this file uses hooks or event state of its own: everything is
 * props-in, markup-out, so it can be rendered from a server component or a
 * client one. Anything that needs state of its own (Toast) lives in its own
 * "use client" file.
 * ------------------------------------------------------------------------ */

/* ---------------------------------------------------------------------------
 * Status vocabulary
 *
 * Picked ONCE and reused everywhere, which is what makes "done" the same green
 * in Roadmaps, Habits, Goals and DSA. Modules map their own enum onto a tone
 * with the tables below rather than choosing colours themselves.
 * ------------------------------------------------------------------------ */

export type Tone = "neutral" | "idle" | "wip" | "done" | "warn" | "accent";

export type Difficulty = "easy" | "medium" | "hard";
export type ProblemStatus = "todo" | "solved" | "revisit";
export type TopicStatus = "not_started" | "learning" | "done";
export type GoalState = "active" | "done" | "dropped";

/** easy is the same green as done; hard the same rose as overdue. */
export const DIFFICULTY_TONE: Record<Difficulty, Tone> = {
  easy: "done",
  medium: "wip",
  hard: "warn",
};

export const PROBLEM_STATUS_TONE: Record<ProblemStatus, Tone> = {
  todo: "idle",
  solved: "done",
  revisit: "wip",
};

export const TOPIC_STATUS_TONE: Record<TopicStatus, Tone> = {
  not_started: "idle",
  learning: "wip",
  done: "done",
};

export const GOAL_STATUS_TONE: Record<GoalState, Tone> = {
  active: "accent",
  done: "done",
  dropped: "idle",
};

/** Human labels, so `not_started` never leaks to the screen. */
export const TOPIC_STATUS_LABEL: Record<TopicStatus, string> = {
  not_started: "Not started",
  learning: "Learning",
  done: "Done",
};

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

const TONE_STROKE: Record<Tone, string> = {
  neutral: "stroke-muted",
  idle: "stroke-idle",
  wip: "stroke-wip",
  done: "stroke-done",
  warn: "stroke-warn",
  accent: "stroke-accent",
};

const TONE_RING: Record<Tone, string> = {
  neutral: "ring-line-strong",
  idle: "ring-idle/40",
  wip: "ring-wip/40",
  done: "ring-done/40",
  warn: "ring-warn/40",
  accent: "ring-accent/40",
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
          <p className="font-mono text-2xs uppercase tracking-[0.14em] text-faint">
            {subtitle}
          </p>
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
    <div
      className={`mb-2.5 flex items-baseline justify-between gap-3 ${className}`}
    >
      <h2 className="text-2xs font-semibold uppercase tracking-[0.14em] text-faint">
        {title}
      </h2>
      {right && <span className="text-xs text-faint">{right}</span>}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Progress
 * ------------------------------------------------------------------------ */

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function ProgressBar({
  value,
  tone = "accent",
  className = "",
}: {
  /** 0–100. Clamped. */
  value: number;
  tone?: Tone;
  className?: string;
}) {
  const pct = clampPct(value);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-raised ${className}`}
    >
      <div
        // `currentColor` drives the glow, so the fill's own text-color utility
        // is what tints it — a shadow doesn't show on true black otherwise.
        className={`h-full rounded-full shadow-[0_0_8px_0_currentColor] transition-[width] duration-500 ease-out ${TONE_FILL[tone]} ${TONE_TEXT[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * The bar's sibling, for places where the number is the headline rather than a
 * footnote. `value: null` draws the empty track — "not scored" is a different
 * statement from 0%, and the ring says so by staying blank.
 */
export function ProgressRing({
  value,
  size = 56,
  stroke = 5,
  tone = "accent",
  children,
  className = "",
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  tone?: Tone;
  children?: ReactNode;
  className?: string;
}) {
  const pct = value === null ? 0 : clampPct(value);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value === null ? undefined : pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={value === null ? "Not scored" : `${pct}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-raised"
        />
        {value !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className={`${TONE_STROKE[tone]} ${TONE_TEXT[tone]} drop-shadow-[0_0_5px_currentColor] transition-[stroke-dashoffset] duration-500 ease-out`}
          />
        )}
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Labels
 * ------------------------------------------------------------------------ */

export function Pill({
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
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-2xs font-medium ${TONE_SOFT[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * The status chip. `dot` adds a leading marker so state is legible without
 * relying on colour alone.
 */
export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-2xs font-medium uppercase tracking-wide ${TONE_SOFT[tone]} ${className}`}
    >
      {dot && (
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${TONE_FILL[tone]}`}
        />
      )}
      {children}
    </span>
  );
}

/** The flame runs on the accent, not a status tone — a streak isn't a state. */
export function StreakBadge({ days }: { days: number }) {
  if (days <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-accent">
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
        <path d="M12 2s5 5 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.3-3.8C8.9 9.7 9.7 11 11 11c0-3 1-6 1-9Z" />
      </svg>
      <span className="font-mono text-xs font-semibold tabular-nums">{days}</span>
      <span className="sr-only">day streak</span>
    </span>
  );
}

/** A headline number. Mono, because it's data. */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  /** 0–100. When set, draws a slim progress bar under the value — for tiles
      that are also a goal-vs-actual (Today's Habits/Water/Calories tiles),
      not just a readout. Omit rather than pass a fabricated number. */
  progress,
  className = "",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  /** Small glyph, top-right — decoration only, never the sole signal. */
  icon?: ReactNode;
  progress?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-gradient-to-b from-raised/60 to-surface px-4 py-3 transition-shadow ${
        tone !== "neutral" ? `ring-1 ring-inset ${TONE_RING[tone]}` : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-faint">
          {label}
        </p>
        {icon && (
          <span aria-hidden className={`shrink-0 [&_svg]:h-4 [&_svg]:w-4 ${TONE_TEXT[tone]}`}>
            {icon}
          </span>
        )}
      </div>
      <p
        className={`mt-1 font-mono text-2xl font-semibold tabular-nums leading-none ${TONE_TEXT[tone]}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-2xs text-faint">{hint}</p>}
      {progress !== undefined && <ProgressBar value={progress} tone={tone} className="mt-2.5" />}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Controls
 * ------------------------------------------------------------------------ */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-[background-color,border-color,color,transform,box-shadow] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const BUTTON_VARIANT = {
  // A resting glow, not just a hover one — a shadow is invisible on true
  // black, so this is what gives the one interactive accent any presence at
  // all before the pointer arrives. Hover deepens it.
  primary:
    "bg-accent text-accent-ink shadow-[0_4px_16px_-4px_rgba(231,164,75,0.45)] hover:opacity-90 hover:shadow-[0_6px_22px_-4px_rgba(231,164,75,0.6)]",
  secondary:
    "border border-line bg-surface text-ink hover:border-line-strong hover:bg-raised",
  ghost: "text-muted hover:bg-raised hover:text-ink",
  danger: "border border-warn/35 bg-warn-soft text-warn hover:border-warn/60",
} as const;

const BUTTON_SIZE = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "w-full px-4 py-2.5 text-sm",
  icon: "h-7 w-7",
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

export function Input({
  className = "",
  ...rest
}: ComponentPropsWithoutRef<"input">) {
  return <input className={`${FIELD_BASE} ${className}`} {...rest} />;
}

export function Textarea({
  className = "",
  ...rest
}: ComponentPropsWithoutRef<"textarea">) {
  return <textarea className={`${FIELD_BASE} resize-y ${className}`} {...rest} />;
}

export function Select({
  className = "",
  children,
  ...rest
}: ComponentPropsWithoutRef<"select">) {
  return (
    <select className={`${FIELD_BASE} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-2xs text-faint">{hint}</span>}
    </label>
  );
}

export type SegmentOption = {
  value: string;
  label: ReactNode;
  /** Emitted as `data-testid`, for per-option hooks. */
  testId?: string;
  tone?: Tone;
};

/**
 * One control for two jobs: filter rows and per-item status pickers.
 *
 * Every option carries `data-value` and `aria-pressed`, so a caller only has to
 * supply the values — it never restyles the pressed state itself.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  size = "sm",
  testId,
  ariaLabel,
  wrap = true,
  className = "",
  optionClassName = "",
}: {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  testId?: string;
  ariaLabel?: string;
  /** Filter rows with many options need to wrap; a table cell must not. */
  wrap?: boolean;
  className?: string;
  optionClassName?: string;
}) {
  const pad = size === "sm" ? "px-2.5 py-1 text-2xs" : "px-3 py-1.5 text-xs";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-testid={testId}
      className={`inline-flex items-center gap-1 rounded-lg border border-line bg-canvas p-1 ${
        wrap ? "flex-wrap" : "flex-nowrap"
      } ${className}`}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        const tone = opt.tone ?? "accent";
        return (
          <button
            key={opt.value}
            type="button"
            data-value={opt.value}
            data-testid={opt.testId}
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={`rounded-md font-medium capitalize transition-colors ${pad} ${
              selected
                ? tone === "accent"
                  ? "bg-accent text-accent-ink"
                  : `${TONE_SOFT[tone]} font-semibold ring-1 ring-inset ${TONE_RING[tone]}`
                : "text-muted hover:bg-raised hover:text-ink"
            } ${optionClassName}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Controlled switch. State lives with the caller. */
export function Toggle({
  checked,
  onChange,
  label,
  className = "",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
        checked ? "border-accent bg-accent" : "border-line bg-raised"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`h-3.5 w-3.5 rounded-full bg-surface transition-transform duration-200 ${
          checked ? "translate-x-[1.15rem]" : "translate-x-[0.15rem]"
        }`}
      />
    </button>
  );
}

/* ---------------------------------------------------------------------------
 * States
 * ------------------------------------------------------------------------ */

/**
 * Empty states point at the next action rather than just reporting absence —
 * "No problems yet" plus what to do about it.
 */
export function EmptyState({
  title,
  hint,
  action,
  icon,
  className = "",
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  /** Small glyph above the title — decoration, not information. */
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
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-raised ${className}`}
    />
  );
}

/** Placeholder for a list that hasn't resolved yet. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-card" />
      ))}
    </div>
  );
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
 * The `<details>` disclosure every "add" form sits in.
 *
 * The summary's text content is EXACTLY the label — no extra nodes with text —
 * because the e2e suites open these by matching that string.
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
