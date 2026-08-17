import { formatShort } from "@/lib/date";
import { formatWeight, toDisplay, type WeightUnit } from "@/lib/weight-unit";

export type WeightPoint = { date: string; weightKg: number };

/**
 * A small trend line, in the same presentation-only spirit as `Heatmap.tsx`:
 * every number arrives pre-computed, this only draws it. Points are spaced
 * evenly by entry rather than proportionally by calendar date — this app logs
 * weight at most once a day, so evenly-spaced is simple and doesn't visibly
 * distort the shape for the gaps a personal tracker actually has.
 *
 * `role="img"` with a text summary, same accessibility approach as the
 * heatmap — the shape itself is decorative, the numbers are what matter.
 */
export default function WeightChart({
  points,
  unit,
  className = "",
}: {
  /** Oldest first. */
  points: WeightPoint[];
  unit: WeightUnit;
  className?: string;
}) {
  if (points.length < 2) return null;

  const W = 300;
  const H = 96;
  const PAD = 6;

  const values = points.map((p) => toDisplay(p.weightKg, unit));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1; // every point identical -> flat line, not a divide-by-zero

  const coords = values.map((v, i) => {
    const x = (i / (points.length - 1)) * (W - PAD * 2) + PAD;
    const y = H - PAD - ((v - min) / span) * (H - PAD * 2);
    return [x, y] as const;
  });

  const first = points[0];
  const last = points[points.length - 1];
  const summary = `Weight trend: ${formatWeight(first.weightKg, unit)} on ${formatShort(first.date)} to ${formatWeight(last.weightKg, unit)} on ${formatShort(last.date)}, ranging ${max.toFixed(1)}–${min.toFixed(1)} ${unit} over ${points.length} entries.`;

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
          className="stroke-accent drop-shadow-[0_0_4px_rgba(247,138,4,0.5)]"
        />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} className="fill-accent" />
        ))}
      </svg>
      <div className="mt-1.5 flex items-center justify-between text-2xs text-faint">
        <span>
          {formatShort(first.date)} · {formatWeight(first.weightKg, unit)}
        </span>
        <span>
          {formatShort(last.date)} · {formatWeight(last.weightKg, unit)}
        </span>
      </div>
    </div>
  );
}
