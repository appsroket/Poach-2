import type { SupabaseClient } from "@supabase/supabase-js";

// Shape returned to the dashboard: a match plus the flattened job/company it
// points at. Used by both the SSR page load and GET /api/matches so the two
// stay in sync.
export type DashboardMatch = {
  id: string;
  score: number | null;
  reasons: { fit: string[]; gaps: string[] };
  status: "new" | "saved";
  job: {
    id: string;
    title: string;
    location: string | null;
    remote: boolean;
    company_name: string;
    posted_at: string | null;
  };
};

// Raw row shape from the embedded PostgREST select (company nests under job).
type Row = {
  id: string;
  score: number | null;
  reasons: { fit?: string[]; gaps?: string[] } | null;
  status: string;
  job: {
    id: string;
    title: string | null;
    location: string | null;
    remote: boolean | null;
    posted_at: string | null;
    company: { name: string | null } | null;
  } | null;
};

// Fetch the signed-in user's active (new/saved) matches, joined to jobs +
// companies, ranked by score desc. RLS scopes rows to the caller — pass a
// cookie-bound server client. Returns [] on error or when the user has none.
export async function getDashboardMatches(
  supabase: SupabaseClient
): Promise<DashboardMatch[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, score, reasons, status, job:jobs ( id, title, location, remote, posted_at, company:companies ( name ) )"
    )
    .in("status", ["new", "saved"])
    .order("score", { ascending: false, nullsFirst: false });

  if (error || !data) return [];

  return (data as unknown as Row[])
    .filter((m) => !!m.job)
    .map((m) => ({
      id: m.id,
      score: m.score,
      reasons: {
        fit: Array.isArray(m.reasons?.fit) ? m.reasons!.fit! : [],
        gaps: Array.isArray(m.reasons?.gaps) ? m.reasons!.gaps! : [],
      },
      status: m.status === "saved" ? "saved" : "new",
      job: {
        id: m.job!.id,
        title: m.job!.title ?? "",
        location: m.job!.location,
        remote: !!m.job!.remote,
        company_name: m.job!.company?.name ?? "A stealth company",
        posted_at: m.job!.posted_at,
      },
    }));
}
