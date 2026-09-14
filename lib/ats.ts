// ATS source adapters. Public JSON APIs first; HTML scraping is a stub.

export type AtsType = "greenhouse" | "lever" | "ashby" | "workable" | "html";

export type NormalizedJob = {
  external_id: string;
  title: string;
  location: string | null;
  remote: boolean;
  employment_type: string | null;
  description: string;
  apply_url: string;
  posted_at: string | null;
};

// Minimal HTML → text: strip tags, decode a few common entities, collapse
// whitespace. Good enough for embedding + display snippets.
function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&rsquo;|&apos;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function looksRemote(...parts: (string | null | undefined)[]): boolean {
  return parts.some((p) => !!p && /\bremote\b/i.test(p));
}

function toIso(value: unknown): string | null {
  if (value == null) return null;
  const d = typeof value === "number" ? new Date(value) : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// --- Providers ------------------------------------------------------------

async function greenhouse(slug: string): Promise<NormalizedJob[]> {
  const data = (await getJson(
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`
  )) as { jobs?: Array<Record<string, any>> };
  return (data.jobs ?? []).map((j) => {
    const location = j.location?.name ?? null;
    return {
      external_id: String(j.id),
      title: j.title ?? "",
      location,
      remote: looksRemote(location, j.title),
      employment_type: null,
      description: htmlToText(j.content),
      apply_url: j.absolute_url ?? "",
      posted_at: toIso(j.updated_at ?? j.first_published),
    };
  });
}

async function lever(slug: string): Promise<NormalizedJob[]> {
  const data = (await getJson(
    `https://api.lever.co/v0/postings/${slug}?mode=json`
  )) as Array<Record<string, any>>;
  return (Array.isArray(data) ? data : []).map((j) => {
    const location = j.categories?.location ?? null;
    return {
      external_id: String(j.id),
      title: j.text ?? "",
      location,
      remote:
        looksRemote(location, j.text) ||
        (j.workplaceType ?? "").toLowerCase() === "remote",
      employment_type: j.categories?.commitment ?? null,
      description: j.descriptionPlain ?? htmlToText(j.description),
      apply_url: j.hostedUrl ?? j.applyUrl ?? "",
      posted_at: toIso(j.createdAt),
    };
  });
}

async function ashby(slug: string): Promise<NormalizedJob[]> {
  const data = (await getJson(
    `https://api.ashbyhq.com/posting-api/job-board/${slug}`
  )) as { jobs?: Array<Record<string, any>> };
  return (data.jobs ?? []).map((j) => {
    const location = j.location ?? null;
    return {
      external_id: String(j.id),
      title: j.title ?? "",
      location,
      remote: Boolean(j.isRemote) || looksRemote(location, j.title),
      employment_type: j.employmentType ?? null,
      description: j.descriptionPlain ?? htmlToText(j.descriptionHtml),
      apply_url: j.jobUrl ?? j.applyUrl ?? "",
      posted_at: toIso(j.publishedAt ?? j.publishedDate),
    };
  });
}

async function workable(slug: string): Promise<NormalizedJob[]> {
  const data = (await getJson(
    `https://apply.workable.com/api/v3/accounts/${slug}/jobs`
  )) as { results?: Array<Record<string, any>> };
  return (data.results ?? []).map((j) => {
    const loc = j.location
      ? [j.location.city, j.location.region, j.location.country]
          .filter(Boolean)
          .join(", ")
      : null;
    return {
      external_id: String(j.shortcode ?? j.id),
      title: j.title ?? "",
      location: loc,
      remote: Boolean(j.remote) || looksRemote(loc, j.title),
      employment_type: j.employment_type ?? j.type ?? null,
      description: j.description ? htmlToText(j.description) : "",
      apply_url: j.url ?? j.application_url ?? j.shortlink ?? "",
      posted_at: toIso(j.published_on ?? j.created_at),
    };
  });
}

// HTML fallback — intentionally a no-op. Implementing this must respect each
// site's robots.txt and Terms of Service; do not scrape without permission.
async function htmlFallback(_slug: string): Promise<NormalizedJob[]> {
  // TODO: per-site HTML parsing, gated on robots.txt / ToS compliance.
  return [];
}

// Fetch + normalize all jobs for a company. Never throws — returns [] on
// failure and logs which company failed.
export async function fetchCompanyJobs(company: {
  ats_type: string | null;
  ats_slug: string | null;
}): Promise<NormalizedJob[]> {
  const { ats_type, ats_slug } = company;
  if (!ats_type || !ats_slug) return [];
  try {
    switch (ats_type) {
      case "greenhouse":
        return await greenhouse(ats_slug);
      case "lever":
        return await lever(ats_slug);
      case "ashby":
        return await ashby(ats_slug);
      case "workable":
        return await workable(ats_slug);
      case "html":
        return await htmlFallback(ats_slug);
      default:
        return [];
    }
  } catch (err) {
    console.error(`[ats] fetch failed for ${ats_type}/${ats_slug}:`, err);
    return [];
  }
}
