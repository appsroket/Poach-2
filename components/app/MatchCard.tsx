"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { ScoreRing } from "./ScoreRing";
import type { DashboardMatch } from "@/lib/matches";

// One match card: company avatar + name, job title (→ detail), a location /
// remote badge, a score ring, up to 3 "why it fits" chips, and a View & Apply
// CTA. The ✕ dismisses. Hover lifts the card and brightens its border.
export function MatchCard({
  match,
  onDismiss,
}: {
  match: DashboardMatch;
  onDismiss: (id: string) => void;
}) {
  const { job, reasons, score } = match;
  const initial = (job.company_name.trim()[0] ?? "?").toUpperCase();
  const badge = job.remote
    ? "Remote"
    : job.location?.trim() || "Location undisclosed";
  const fit = reasons.fit.slice(0, 3);

  return (
    <div className="group relative rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]">
      <button
        type="button"
        onClick={() => onDismiss(match.id)}
        aria-label="Dismiss match"
        className="absolute right-3 top-3 rounded-full p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4 pr-8">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/90 font-display text-sm font-semibold text-white"
              aria-hidden="true"
            >
              {initial}
            </span>
            <span className="truncate text-sm text-muted">
              {job.company_name}
            </span>
          </div>

          <Link
            href={`/jobs/${job.id}`}
            className="font-display text-base font-semibold leading-snug text-ink transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
          >
            {job.title}
          </Link>

          <span className="w-fit rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-muted">
            {badge}
          </span>
        </div>

        <ScoreRing value={score ?? 0} />
      </div>

      {fit.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {fit.map((reason, i) => (
            <span
              key={i}
              className="rounded-md bg-accent/10 px-2 py-1 text-xs text-ink/80"
            >
              {reason}
            </span>
          ))}
        </div>
      )}

      <Link
        href={`/jobs/${job.id}`}
        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
      >
        View &amp; Apply
      </Link>
    </div>
  );
}
