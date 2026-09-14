import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";
import { getPlan } from "@/lib/plan";
import { anthropic } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM =
  "You tailor a candidate's real experience to a specific job. NEVER invent " +
  "employers, titles, dates, or achievements not present in the candidate " +
  "data. Return ONLY minified JSON.";

// Pull the first balanced-looking JSON object out of a model response,
// tolerating code fences and surrounding prose.
function extractJsonObject(raw: string): {
  tailored_bullets?: unknown;
  cover_letter?: unknown;
} {
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) s = s.slice(start, end + 1);
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { job_id?: string };
  const jobId = body.job_id;
  if (!jobId) {
    return NextResponse.json({ error: "job_id required" }, { status: 400 });
  }

  const supabase = await createServerClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, description")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) {
    return NextResponse.json({ error: "job_not_found" }, { status: 404 });
  }

  const { data: resume } = await supabase
    .from("resumes")
    .select("parsed")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();
  const parsedResume = (resume?.parsed ?? null) as Record<string, unknown> | null;
  if (!parsedResume || Object.keys(parsedResume).length === 0) {
    return NextResponse.json({ ok: false, error: "no_resume" }, { status: 400 });
  }

  // Free tier: one tailored application total. Count prior tailored apps for
  // OTHER jobs — regenerating this job's own application stays allowed.
  const plan = await getPlan(user.id);
  if (plan === "free") {
    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("tailored_resume", "is", null)
      .neq("job_id", jobId);
    if ((count ?? 0) >= 1) {
      return NextResponse.json({ ok: false, error: "upgrade" });
    }
  }

  let bullets: string[] = [];
  let coverLetter = "";
  try {
    const raw = await anthropic({
      system: SYSTEM,
      user: `Candidate resume (JSON): ${JSON.stringify(parsedResume)}

Job title: ${job.title}
Job description: ${(job.description ?? "").slice(0, 4000)}

Return JSON: { tailored_bullets: string[5] (rewrite the candidate's real experience to mirror this job's language and requirements, truthful only), cover_letter: string (max 180 words, specific, in first person, references the company and role) }.`,
      maxTokens: 1500,
    });
    const out = extractJsonObject(raw);
    bullets = Array.isArray(out.tailored_bullets)
      ? out.tailored_bullets
          .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
          .slice(0, 5)
      : [];
    coverLetter = typeof out.cover_letter === "string" ? out.cover_letter.trim() : "";
  } catch (err) {
    console.error("[applications/generate] model call failed:", err);
    return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 502 });
  }

  if (bullets.length === 0 && !coverLetter) {
    return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 502 });
  }

  // Write without regressing an already-advanced stage.
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  let applicationId: string;
  if (existing) {
    await supabase
      .from("applications")
      .update({
        tailored_resume: { bullets },
        cover_letter: coverLetter,
        status: "draft",
      })
      .eq("id", existing.id)
      .eq("user_id", user.id);
    applicationId = existing.id;
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        job_id: jobId,
        tailored_resume: { bullets },
        cover_letter: coverLetter,
        status: "draft",
        stage: "matched",
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
    applicationId = inserted.id;
  }

  return NextResponse.json({
    ok: true,
    application_id: applicationId,
    tailored_bullets: bullets,
    cover_letter: coverLetter,
  });
}
