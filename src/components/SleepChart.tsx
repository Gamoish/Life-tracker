import { formatShort } from "@/lib/date";
import { formatDuration } from "@/lib/sleep";

export type SleepPoint = { date: string; durationMin: number };

/**
 * A sleep-hours trend line, the sibling of `WeightChart` and drawn the same
 * way: every number arrives pre-computed, points are spaced evenly by entry
 * (this app logs at most one night per day), and the shape is `role="img"`
 * decoration with a text summary carrying the real information.
 */
export default function SleepChart({
  points,
  className = "",
}: {
  /** Oldest first. */
  points: SleepPoint[];
  className?: string;
}) {
  if (points.length < 2) return null;

  const W = 300;
  const H = 96;
  const PAD = 6;

  const hours = points.map((p) => p.durationMin / 60);
  const min = Math.min(...hours);
  const max = Math.max(...hours);
  const span = max - min || 1; // every night identical -> flat line, not a divide-by-zero

  const coords = hours.map((v, i) => {
    const x = (i / (points.length - 1)) * (W - PAD * 2) + PAD;
    const y = H - PAD - ((v - min) / span) * (H - PAD * 2);
    return [x, y] as const;
  });

  const first = points[0];
  const last = points[points.length - 1];
  const summary = `Sleep trend: ${formatDuration(first.durationMin)} on ${formatShort(first.date)} to ${formatDuration(last.durationMin)} on ${formatShort(last.date)}, ranging ${min.toFixed(1)}–${max.toFixed(1)} hours over ${points.length} nights.`;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-24 w-full"
        role="img"
        aria-label={summary}
      >
        <polyline
          points={coords.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="stroke-wip drop-shadow-[0_0_4px_rgba(111,168,230,0.5)]"
        />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} className="fill-wip" />
        ))}
      </svg>
      <div className="mt-1.5 flex items-center justify-between text-2xs text-faint">
        <span>
          {formatShort(first.date)} · {formatDuration(first.durationMin)}
        </span>
        <span>
          {formatShort(last.date)} · {formatDuration(last.durationMin)}
        </span>
      </div>
    </div>
  );
}
