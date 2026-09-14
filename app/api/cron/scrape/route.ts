import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { fetchCompanyJobs } from "@/lib/ats";
import { embed, toPgVector } from "@/lib/embeddings";
import { isAuthorizedCron } from "@/lib/cron";

export const runtime = "nodejs";
export const maxDuration = 300;

// Cap embeddings per run so the function stays within its time budget; the
// remainder get embedded on subsequent runs.
const EMBED_LIMIT = 200;

// Best-effort seed of real public ATS boards so there's test data on first
// run. Some slugs may need adjusting over time — failures just return [].
const SEED_COMPANIES: {
  name: string;
  ats_type: string;
  ats_slug: string;
  careers_url: string;
}[] = [
  { name: "Canonical", ats_type: "greenhouse", ats_slug: "canonical", careers_url: "https://canonical.com/careers" },
  { name: "GitLab", ats_type: "greenhouse", ats_slug: "gitlab", careers_url: "https://about.gitlab.com/jobs/" },
  { name: "Dropbox", ats_type: "greenhouse", ats_slug: "dropbox", careers_url: "https://jobs.dropbox.com" },
  { name: "Airbnb", ats_type: "greenhouse", ats_slug: "airbnb", careers_url: "https://careers.airbnb.com" },
  { name: "Coinbase", ats_type: "greenhouse", ats_slug: "coinbase", careers_url: "https://www.coinbase.com/careers" },
  { name: "Databricks", ats_type: "greenhouse", ats_slug: "databricks", careers_url: "https://www.databricks.com/company/careers" },
  { name: "Robinhood", ats_type: "greenhouse", ats_slug: "robinhood", careers_url: "https://careers.robinhood.com" },
  { name: "Brex", ats_type: "greenhouse", ats_slug: "brex", careers_url: "https://www.brex.com/careers" },
  { name: "Cruise", ats_type: "greenhouse", ats_slug: "cruise", careers_url: "https://getcruise.com/careers" },
  { name: "Flexport", ats_type: "greenhouse", ats_slug: "flexport", careers_url: "https://www.flexport.com/careers" },
  { name: "Benchling", ats_type: "greenhouse", ats_slug: "benchling", careers_url: "https://www.benchling.com/careers" },
  { name: "Discord", ats_type: "greenhouse", ats_slug: "discord", careers_url: "https://discord.com/careers" },
  { name: "Netlify", ats_type: "lever", ats_slug: "netlify", careers_url: "https://www.netlify.com/careers/" },
  { name: "Plaid", ats_type: "lever", ats_slug: "plaid", careers_url: "https://plaid.com/careers/" },
  { name: "Ashby", ats_type: "ashby", ats_slug: "Ashby", careers_url: "https://www.ashbyhq.com/careers" },
  { name: "Linear", ats_type: "ashby", ats_slug: "Linear", careers_url: "https://linear.app/careers" },
  { name: "PostHog", ats_type: "ashby", ats_slug: "posthog", careers_url: "https://posthog.com/careers" },
  { name: "Ramp", ats_type: "ashby", ats_slug: "Ramp", careers_url: "https://ramp.com/careers" },
  { name: "Vercel", ats_type: "greenhouse", ats_slug: "vercel", careers_url: "https://vercel.com/careers" },
  { name: "Figma", ats_type: "greenhouse", ats_slug: "figma", careers_url: "https://www.figma.com/careers/" },
];

async function handle(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Seed if empty.
  const { data: existing } = await supabase.from("companies").select("id");
  if (!existing || existing.length === 0) {
    await supabase.from("companies").insert(SEED_COMPANIES);
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id, ats_type, ats_slug, name");
  if (!companies) {
    return NextResponse.json({ error: "no_companies" }, { status: 500 });
  }

  let jobsUpserted = 0;

  for (const company of companies) {
    const normalized = await fetchCompanyJobs({
      ats_type: company.ats_type,
      ats_slug: company.ats_slug,
    });

    // Only rows with an apply_url (NOT NULL column) are valid.
    const rows = normalized
      .filter((j) => j.apply_url && j.external_id)
      .map((j) => ({
        company_id: company.id,
        external_id: j.external_id,
        title: j.title,
        location: j.location,
        remote: j.remote,
        employment_type: j.employment_type,
        description: j.description,
        apply_url: j.apply_url,
        posted_at: j.posted_at,
        is_active: true,
      }));

    if (rows.length === 0) continue;

    const { error: upsertErr } = await supabase
      .from("jobs")
      .upsert(rows, { onConflict: "company_id,external_id" });
    if (upsertErr) {
      console.error(`[scrape] upsert failed for ${company.name}:`, upsertErr);
      continue;
    }
    jobsUpserted += rows.length;

    // Deactivate jobs for this company we didn't see this run (only when we
    // actually got results, so a transient fetch failure can't nuke them).
    const seen = rows.map((r) => r.external_id);
    await supabase
      .from("jobs")
      .update({ is_active: false })
      .eq("company_id", company.id)
      .not("external_id", "in", `(${seen.map((v) => `"${v}"`).join(",")})`);
  }

  // Embed jobs missing an embedding (new inserts + any prior gaps), capped.
  const { data: toEmbed } = await supabase
    .from("jobs")
    .select("id, title, description")
    .is("embedding", null)
    .eq("is_active", true)
    .limit(EMBED_LIMIT);

  if (toEmbed) {
    for (const job of toEmbed) {
      try {
        const vector = await embed(`${job.title}\n${job.description ?? ""}`);
        await supabase
          .from("jobs")
          .update({ embedding: toPgVector(vector) })
          .eq("id", job.id);
      } catch (err) {
        console.error(`[scrape] embed failed for job ${job.id}:`, err);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    companies: companies.length,
    jobs_upserted: jobsUpserted,
  });
}

export async function POST(request: Request) {
  return handle(request);
}

// Vercel Cron invokes with GET; delegate so the same guard applies.
export async function GET(request: Request) {
  return handle(request);
}
