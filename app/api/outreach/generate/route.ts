import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";
import { anthropic } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM =
  "Write a short, warm, specific cold intro email from a job seeker to a " +
  "hiring manager. Not salesy. Reference the exact role and 1–2 concrete, " +
  "real fits from the candidate. Return ONLY JSON.";

function extractJsonObject(raw: string): {
  subject?: unknown;
  body?: unknown;
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

  const body = (await request.json().catch(() => ({}))) as {
    application_id?: string;
    contact_name?: string;
    contact_title?: string;
    contact_email?: string;
  };
  const applicationId = body.application_id;
  if (!applicationId) {
    return NextResponse.json(
      { error: "application_id required" },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();

  const { data: application } = await supabase
    .from("applications")
    .select("id, job_id")
    .eq("id", applicationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!application) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("title, description, company:companies ( name )")
    .eq("id", application.job_id)
    .maybeSingle();
  const jobRow = job as unknown as {
    title: string;
    description: string | null;
    company: { name: string | null } | null;
  } | null;

  const { data: resume } = await supabase
    .from("resumes")
    .select("parsed")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();
  const parsed = (resume?.parsed ?? {}) as {
    summary?: string;
    headline?: string;
    titles?: string[];
    skills?: string[];
  };
  const candidateSummary =
    parsed.summary ||
    parsed.headline ||
    [
      Array.isArray(parsed.titles) ? parsed.titles.join(", ") : "",
      Array.isArray(parsed.skills) ? parsed.skills.slice(0, 8).join(", ") : "",
    ]
      .filter(Boolean)
      .join(" — ");

  const contactName = body.contact_name?.trim() || null;
  const contactTitle = body.contact_title?.trim() || null;
  const contactEmail = body.contact_email?.trim() || null;
  const companyName = jobRow?.company?.name ?? "the company";

  let subject = "";
  let emailBody = "";
  try {
    const raw = await anthropic({
      system: SYSTEM,
      user: `Candidate summary: ${candidateSummary || "(not provided)"}

Company: ${companyName}
Job title: ${jobRow?.title ?? ""}
Job description: ${(jobRow?.description ?? "").slice(0, 1500)}
Hiring manager name: ${contactName ?? "(unknown)"}
Hiring manager title: ${contactTitle ?? "(unknown)"}

Return JSON: { subject: string, body: string (max 130 words, first person, ends with a soft ask for a quick chat) }.`,
      maxTokens: 700,
    });
    const out = extractJsonObject(raw);
    subject = typeof out.subject === "string" ? out.subject.trim() : "";
    emailBody = typeof out.body === "string" ? out.body.trim() : "";
  } catch (err) {
    console.error("[outreach/generate] model call failed:", err);
    return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 502 });
  }

  if (!emailBody) {
    return NextResponse.json({ ok: false, error: "generation_failed" }, { status: 502 });
  }
  if (!subject) subject = `Quick note about the ${jobRow?.title ?? "role"}`;

  // Upsert the outreach draft for this application (no unique index, so
  // check-then-write keeps one draft per application).
  const { data: existing } = await supabase
    .from("outreach")
    .select("id")
    .eq("user_id", user.id)
    .eq("application_id", applicationId)
    .maybeSingle();

  const fields = {
    contact_name: contactName,
    contact_title: contactTitle,
    contact_email: contactEmail,
    message: emailBody,
    status: "draft",
  };

  let outreachId: string;
  if (existing) {
    await supabase
      .from("outreach")
      .update(fields)
      .eq("id", existing.id)
      .eq("user_id", user.id);
    outreachId = existing.id;
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from("outreach")
      .insert({ user_id: user.id, application_id: applicationId, ...fields })
      .select("id")
      .single();
    if (insErr || !inserted) {
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
    outreachId = inserted.id;
  }

  return NextResponse.json({
    ok: true,
    outreach_id: outreachId,
    subject,
    body: emailBody,
  });
}
