"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MatchCard } from "./MatchCard";
import { SkeletonGrid, EmptyState } from "./DashboardStates";
import type { DashboardMatch } from "@/lib/matches";
import type { Plan } from "@/lib/plan";

const FREE_VISIBLE = 5;

const SENIORITY_OPTIONS = [
  { value: "all", label: "All levels" },
  { value: "intern", label: "Intern" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Staff" },
];

// No seniority column on jobs, so infer a bucket from the title for filtering.
function seniorityOf(title: string): string {
  const t = title.toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return "intern";
  if (/\b(principal|staff|lead|head|director|vp|architect)\b/.test(t))
    return "lead";
  if (/\b(senior|sr\.?)\b/.test(t)) return "senior";
  if (/\b(junior|jr\.?|associate|entry|grad(uate)?)\b/.test(t)) return "junior";
  return "mid";
}

type Filters = {
  q: string;
  remoteOnly: boolean;
  seniority: string;
  minScore: number;
};

const INITIAL_FILTERS: Filters = {
  q: "",
  remoteOnly: false,
  seniority: "all",
  minScore: 0,
};

export function DashboardClient({
  initialMatches,
  plan: initialPlan,
}: {
  initialMatches: DashboardMatch[];
  plan: Plan;
}) {
  const [matches, setMatches] = useState<DashboardMatch[]>(initialMatches);
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [updatedLabel, setUpdatedLabel] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");

  const stamp = useCallback(() => {
    setUpdatedLabel(
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }, []);

  // Revalidate against the API on mount so late-arriving matches show up
  // without a manual refresh.
  useEffect(() => {
    let active = true;
    (async () => {
      if (initialMatches.length === 0) setLoading(true);
      try {
        const res = await fetch("/api/matches", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          matches: DashboardMatch[];
          plan: Plan;
        };
        if (!active) return;
        setMatches(data.matches);
        setPlan(data.plan);
      } catch {
        // Keep SSR data on failure.
      } finally {
        if (active) {
          setLoading(false);
          stamp();
        }
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = matches.length;

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return matches.filter((m) => {
      if (filters.remoteOnly && !m.job.remote) return false;
      if (
        filters.seniority !== "all" &&
        seniorityOf(m.job.title) !== filters.seniority
      )
        return false;
      if (Math.round((m.score ?? 0) * 100) < filters.minScore) return false;
      if (q) {
        const hay = `${m.job.title} ${m.job.company_name} ${
          m.job.location ?? ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matches, filters]);

  const dismiss = useCallback(
    async (id: string) => {
      const snapshot = matches;
      setMatches((prev) => prev.filter((m) => m.id !== id));
      try {
        const res = await fetch(`/api/matches/${id}/dismiss`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error("dismiss failed");
      } catch {
        setMatches(snapshot); // revert on failure
      }
    },
    [matches]
  );

  const upgrade = useCallback(async () => {
    setUpgrading(true);
    setUpgradeError("");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setUpgradeError("Checkout isn't available yet. Please try again shortly.");
    } catch {
      setUpgradeError("Something went wrong. Please try again.");
    } finally {
      setUpgrading(false);
    }
  }, []);

  const isFree = plan === "free";
  const visible = isFree ? filtered.slice(0, FREE_VISIBLE) : filtered;
  const locked = isFree ? filtered.slice(FREE_VISIBLE) : [];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-ink">
          Your hidden jobs
        </h1>
        <p className="text-sm text-muted">
          {total} match{total === 1 ? "" : "es"} from companies that never
          posted publicly.
        </p>
        {updatedLabel && (
          <p className="text-xs text-muted/70">Last updated {updatedLabel}</p>
        )}
      </header>

      <FilterBar filters={filters} onChange={setFilters} />

      {loading && matches.length === 0 ? (
        <SkeletonGrid />
      ) : total === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-muted">
          No matches fit these filters. Try loosening them.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {visible.map((m) => (
              <MatchCard key={m.id} match={m} onDismiss={dismiss} />
            ))}
          </div>

          {locked.length > 0 && (
            <div className="relative">
              <div
                className="pointer-events-none grid select-none grid-cols-1 gap-5 blur-sm lg:grid-cols-2"
                aria-hidden="true"
              >
                {locked.map((m) => (
                  <MatchCard key={m.id} match={m} onDismiss={() => {}} />
                ))}
              </div>

              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-base/80 p-6 text-center backdrop-blur">
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Unlock all {total} matches
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    Free shows your top {FREE_VISIBLE}. Go Pro to see every
                    hidden job we find for you.
                  </p>
                  <button
                    type="button"
                    onClick={upgrade}
                    disabled={upgrading}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-accent/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
                  >
                    {upgrading ? "Starting checkout…" : "Upgrade"}
                  </button>
                  {upgradeError && (
                    <p className="mt-2 text-xs text-red-400">{upgradeError}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Filters bar ----------------------------------------------------------

function FilterBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:min-w-[12rem]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Search title, company, location"
          className="w-full rounded-xl border border-white/10 bg-base/60 py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted/60 focus:border-accent/50 focus:outline-none"
        />
      </div>

      <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={filters.remoteOnly}
          onChange={(e) => set("remoteOnly", e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-base accent-accent"
        />
        Remote only
      </label>

      <select
        value={filters.seniority}
        onChange={(e) => set("seniority", e.target.value)}
        className="rounded-xl border border-white/10 bg-base/60 px-3 py-2 text-sm text-ink focus:border-accent/50 focus:outline-none"
      >
        {SENIORITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value} className="bg-base">
            {o.label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-sm text-muted">
        <span className="whitespace-nowrap">Min {filters.minScore}%</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={filters.minScore}
          onChange={(e) => set("minScore", Number(e.target.value))}
          className="w-28 accent-accent"
        />
      </label>
    </div>
  );
}
