import { Skeleton } from "@/components/ui";

/**
 * Next.js renders this automatically as the Suspense fallback for every
 * route under `(app)` — every page here is `force-dynamic` (a DB read on
 * every request), so navigation has real latency worth covering instead of
 * a blank flash. Generic on purpose: it approximates the header + tiles +
 * cards shape most pages share rather than one exact page's layout.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="mb-6 md:mb-8">
        <Skeleton className="mb-2 h-3 w-28" />
        <Skeleton className="h-8 w-56" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-80 rounded-card" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-36 rounded-card" />
          <Skeleton className="h-36 rounded-card" />
        </div>
      </div>
    </div>
  );
}
