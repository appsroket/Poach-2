import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

// POST /api/applications/[id]/send — mark the application applied. Sets
// sent_at once, advances stage to 'applied', and logs the transition.
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createServerClient();

  const { data: app } = await supabase
    .from("applications")
    .select("id, stage, sent_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!app) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const update: Record<string, unknown> = { stage: "applied" };
  if (!app.sent_at) update.sent_at = new Date().toISOString();

  const { error } = await supabase
    .from("applications")
    .update(update)
    .eq("id", app.id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  if (app.stage !== "applied") {
    await supabase.from("activities").insert({
      user_id: user.id,
      application_id: app.id,
      type: "stage_change",
      body: "applied",
    });
  }

  return NextResponse.json({ ok: true });
}
