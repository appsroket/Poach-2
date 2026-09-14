// Loading + empty presentational states for the dashboard feed.

// Six shimmer cards mirroring the MatchCard footprint.
export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-white/10" />
                <div className="h-3 w-24 rounded bg-white/10" />
              </div>
              <div className="h-4 w-3/4 rounded bg-white/10" />
              <div className="h-5 w-20 rounded-full bg-white/10" />
            </div>
            <div className="h-14 w-14 rounded-full bg-white/10" />
          </div>
          <div className="mt-4 flex gap-1.5">
            <div className="h-6 w-16 rounded-md bg-white/10" />
            <div className="h-6 w-20 rounded-md bg-white/10" />
          </div>
          <div className="mt-4 h-9 w-full rounded-xl bg-white/10" />
        </div>
      ))}
    </div>
  );
}

// Shown when the user has no active matches yet.
export function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-6 py-20 text-center">
      <div className="glow-orb absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 bg-accent/30" />
      <div className="relative">
        <h2 className="font-display text-xl font-semibold text-ink">
          We&apos;re hunting.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Your first matches land within a day — jobs from companies that never
          posted them publicly.
        </p>
      </div>
    </div>
  );
}
