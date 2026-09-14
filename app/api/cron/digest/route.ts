import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { isAuthorizedCron } from "@/lib/cron";
import { sendEmail } from "@/lib/resend";
import { signUnsub, siteUrl } from "@/lib/unsub";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_JOBS_LISTED = 5;

type NotifRow = {
  user_id: string;
  match: {
    job: {
      title: string | null;
      company: { name: string | null } | null;
    } | null;
  } | null;
};

type JobLine = { title: string; company: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Branded dark digest email.
function renderEmail(
  jobs: JobLine[],
  dashboardUrl: string,
  unsubUrl: string
): string {
  const rows = jobs
    .map(
      (j) => `
      <tr><td style="padding:12px 16px;border:1px solid #1e1e22;border-radius:12px;background:#141417">
        <a href="${dashboardUrl}" style="text-decoration:none;color:#EDEDEF">
          <div style="font-weight:600;font-size:15px">${escapeHtml(j.title)}</div>
          <div style="color:#A1A1AA;font-size:13px;margin-top:2px">${escapeHtml(j.company)}</div>
        </a>
      </td></tr>
      <tr><td style="height:8px"></td></tr>`
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#0A0A0B;padding:32px 0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;padding:0 20px">
      <tr><td style="padding-bottom:20px">
        <div style="color:#7C5CFF;font-weight:700;font-size:18px;letter-spacing:-0.02em">Poach</div>
      </td></tr>
      <tr><td style="padding-bottom:16px">
        <h1 style="color:#EDEDEF;font-size:22px;margin:0;line-height:1.3">Hidden jobs that match you</h1>
        <p style="color:#A1A1AA;font-size:14px;margin:8px 0 0">From companies that never posted publicly. Here are your top picks.</p>
      </td></tr>
      ${rows}
      <tr><td style="padding-top:12px">
        <a href="${dashboardUrl}" style="display:inline-block;background:#7C5CFF;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:12px">See all your matches</a>
      </td></tr>
      <tr><td style="padding-top:28px;border-top:1px solid #1e1e22;margin-top:24px">
        <p style="color:#71717A;font-size:12px;margin:16px 0 0">
          You're getting this because you signed up for Poach.
          <a href="${unsubUrl}" style="color:#A1A1AA">Unsubscribe</a>.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

async function handle(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Unread new-match notifications across all users (service role bypasses RLS).
  const { data: notifs } = await supabase
    .from("notifications")
    .select(
      "user_id, match:matches ( job:jobs ( title, company:companies ( name ) ) )"
    )
    .eq("read", false)
    .eq("type", "new_match");

  const rows = (notifs ?? []) as unknown as NotifRow[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // Group job lines per user (cap the list length).
  const byUser = new Map<string, JobLine[]>();
  for (const r of rows) {
    if (!r.user_id || !r.match?.job) continue;
    const list = byUser.get(r.user_id) ?? [];
    if (list.length < MAX_JOBS_LISTED) {
      list.push({
        title: r.match.job.title ?? "A new role",
        company: r.match.job.company?.name ?? "A stealth company",
      });
    }
    byUser.set(r.user_id, list);
  }

  const userIds = [...byUser.keys()];

  // Respect opt-out.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email_optout")
    .in("id", userIds);
  const optedIn = new Set(
    (profiles ?? [])
      .filter((p) => p.email_optout === false)
      .map((p) => p.id as string)
  );

  const dashboardUrl = `${siteUrl()}/dashboard`;
  let sent = 0;

  for (const userId of userIds) {
    if (!optedIn.has(userId)) continue;
    const jobs = byUser.get(userId) ?? [];
    if (jobs.length === 0) continue;

    // Resolve the user's email via the admin API.
    let email: string | null = null;
    try {
      const { data } = await supabase.auth.admin.getUserById(userId);
      email = data.user?.email ?? null;
    } catch {
      email = null;
    }
    if (!email) continue;

    const unsubUrl = `${siteUrl()}/api/unsubscribe?u=${userId}&t=${signUnsub(
      userId
    )}`;
    const subject = `${jobs.length} new hidden job${
      jobs.length === 1 ? "" : "s"
    } match you today`;
    const text = jobs.map((j) => `• ${j.title} — ${j.company}`).join("\n");

    try {
      const ok = await sendEmail({
        to: email,
        subject,
        text: `${text}\n\nSee all: ${dashboardUrl}`,
        html: renderEmail(jobs, dashboardUrl, unsubUrl),
      });
      if (ok) sent += 1;
    } catch (err) {
      console.error(`[digest] send failed for ${userId}:`, err);
    }
  }

  return NextResponse.json({ ok: true, sent });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
