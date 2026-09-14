import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";
import { getPlan } from "@/lib/plan";
import { sendEmail } from "@/lib/resend";

export const runtime = "nodejs";

const FOLLOWUP_DAYS = 4;

// POST /api/outreach/[id]/send — pro-only. Emails via Resend when there's a
// contact_email + key, otherwise returns mode:'clipboard' for manual send.
// Marks sent, stamps sent_at, and schedules a +4-day follow-up activity.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const plan = await getPlan(user.id);
  if (plan === "free") {
    return NextResponse.json({ ok: false, error: "upgrade" });
  }

  const body = (await request.json().catch(() => ({}))) as { subject?: string };

  const supabase = await createServerClient();

  const { data: outreach } = await supabase
    .from("outreach")
    .select("id, application_id, contact_email, message")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!outreach) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const subject = body.subject?.trim() || "Quick note about your open role";
  let mode: "email" | "clipboard" = "clipboard";

  if (outreach.contact_email && process.env.RESEND_API_KEY) {
    try {
      const sent = await sendEmail({
        to: outreach.contact_email,
        subject,
        text: outreach.message ?? "",
        replyTo: user.email ?? undefined,
      });
      if (sent) mode = "email";
    } catch (err) {
      console.error("[outreach/send] email failed, falling back:", err);
      mode = "clipboard";
    }
  }

  const nowIso = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("outreach")
    .update({ status: "sent", sent_at: nowIso })
    .eq("id", outreach.id)
    .eq("user_id", user.id);
  if (updErr) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  const dueAt = new Date(
    Date.now() + FOLLOWUP_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  await supabase.from("activities").insert({
    user_id: user.id,
    application_id: outreach.application_id,
    type: "followup",
    body: "Follow up on outreach",
    due_at: dueAt,
    done: false,
  });

  return NextResponse.json({ ok: true, mode });
}
