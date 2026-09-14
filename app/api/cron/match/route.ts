import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { anthropic } from "@/lib/anthropic";
import { isAuthorizedCron } from "@/lib/cron";

export const runtime = "nodejs";
export const maxDuration = 300;

const MATCH_COUNT = 150;
const KEEP_TOP = 40;
const NOTIFY_THRESHOLD = 0.75;
const REASONS_TOP = 10;

type JobLite = {
  id: string;
  title: string;
  location: string | null;
  remote: boolean;
  description: string | null;
};

function titleMatches(title: string, roles: string[] | null): boolean {
  if (!roles || roles.length === 0) return true;
  const t = title.toLowerCase();
  return roles.some((r) => {
    const x = r.toLowerCase().trim();
    return x.length > 0 && (t.includes(x) || x.includes(t));
  });
}

function locationOk(
  job: JobLite,
  locations: string[] | null,
  remotePref: string | null
): boolean {
  const allowsRemote = remotePref !== "onsite";
  if (job.remote && allowsRemote) return true;
  if (!locations || locations.length === 0) return true;
  const loc = (job.location ?? "").toLowerCase();
  return locations.some((l) => {
    const x = l.toLowerCase().trim();
    if (!x) return false;
    if (x === "remote") return job.remote && allowsRemote;
    return loc.includes(x);
  });
}

// Pull a JSON array out of a model response, tolerating fences/prose.
function extractJsonArray(raw: string): unknown[] {
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function handle(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Users with a primary resume embedding.
  const { data: resumes } = await supabase
    .from("resumes")
    .select("user_id, embedding, parsed")
    .eq("is_primary", true)
    .not("embedding", "is", null);

  if (!resumes || resumes.length === 0) {
    return NextResponse.json({ ok: true, users: 0, new_matches: 0 });
  }

  // Preferences per user.
  const userIds = resumes.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, target_roles, target_locations, remote_pref")
    .in("id", userIds);
  const prefsById = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  let newMatchesTotal = 0;

  for (const resume of resumes) {
    const userId = resume.user_id as string;
    const prefs = prefsById.get(userId);

    // 1) Vector search.
    const { data: ranked, error: rpcErr } = await supabase.rpc("match_jobs", {
      query_embedding: resume.embedding,
      match_count: MATCH_COUNT,
    });
    if (rpcErr || !ranked || ranked.length === 0) continue;

    const scoreByJob = new Map<string, number>(
      ranked.map((r: { job_id: string; score: number }) => [r.job_id, r.score])
    );
    const jobIds: string[] = ranked.map((r: { job_id: string }) => r.job_id);

    // 2) Job details for filtering.
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, title, location, remote, description")
      .in("id", jobIds);
    const jobById = new Map<string, JobLite>(
      (jobs ?? []).map((j) => [j.id, j as JobLite])
    );

    // 3) Filter by preferences, preserving rank order, keep top N.
    const candidates: JobLite[] = jobIds
      .map((id: string) => jobById.get(id))
      .filter((j): j is JobLite => !!j)
      .filter(
        (j) =>
          titleMatches(j.title, prefs?.target_roles ?? null) &&
          locationOk(j, prefs?.target_locations ?? null, prefs?.remote_pref ?? null)
      )
      .slice(0, KEEP_TOP);
    if (candidates.length === 0) continue;

    // 4) Which are genuinely new?
    const candidateIds = candidates.map((c) => c.id);
    const { data: existing } = await supabase
      .from("matches")
      .select("job_id")
      .eq("user_id", userId)
      .in("job_id", candidateIds);
    const existingSet = new Set((existing ?? []).map((m) => m.job_id));
    const newRows = candidates
      .filter((c) => !existingSet.has(c.id))
      .map((c) => ({
        user_id: userId,
        job_id: c.id,
        score: scoreByJob.get(c.id) ?? null,
      }));
    if (newRows.length === 0) continue;

    const { data: inserted } = await supabase
      .from("matches")
      .upsert(newRows, { onConflict: "user_id,job_id", ignoreDuplicates: true })
      .select("id, job_id, score");
    if (!inserted || inserted.length === 0) continue;
    newMatchesTotal += inserted.length;

    // 5) Notifications for strong new matches.
    const notifRows = inserted
      .filter((m) => (m.score ?? 0) >= NOTIFY_THRESHOLD)
      .map((m) => ({ user_id: userId, match_id: m.id, type: "new_match" }));
    if (notifRows.length > 0) {
      await supabase.from("notifications").insert(notifRows);
    }

    // 6) Reasons for the top new matches only (cost control).
    const topNew = [...inserted]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, REASONS_TOP);
    const parsed = (resume.parsed ?? {}) as { summary?: string; headline?: string };
    const summary = parsed.summary || parsed.headline || "";

    try {
      const jobsForPrompt = topNew.map((m) => {
        const j = jobById.get(m.job_id);
        return {
          job_id: m.job_id,
          title: j?.title ?? "",
          description: (j?.description ?? "").slice(0, 500),
        };
      });
      const raw = await anthropic({
        system:
          "You are a job-fit analyst. Return ONLY a valid minified JSON array, no prose, no code fences.",
        user: `Candidate summary: ${summary}\n\nJobs:\n${JSON.stringify(
          jobsForPrompt
        )}\n\nFor each job return { job_id, fit: [two short reasons this candidate fits], gaps: [one short gap] }. Return a JSON array with one object per job.`,
        maxTokens: 1024,
      });
      const items = extractJsonArray(raw) as Array<{
        job_id?: string;
        fit?: string[];
        gaps?: string[];
      }>;
      for (const item of items) {
        if (!item?.job_id) continue;
        await supabase
          .from("matches")
          .update({
            reasons: {
              fit: Array.isArray(item.fit) ? item.fit.slice(0, 2) : [],
              gaps: Array.isArray(item.gaps) ? item.gaps.slice(0, 1) : [],
            },
          })
          .eq("user_id", userId)
          .eq("job_id", item.job_id);
      }
    } catch (err) {
      console.error(`[match] reasons failed for ${userId}:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    users: resumes.length,
    new_matches: newMatchesTotal,
  });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
