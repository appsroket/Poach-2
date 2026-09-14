import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

const STATUSES = new Set(["draft", "approved", "sent"]);
const STAGES = new Set([
  "matched",
  "applied",
  "replied",
  "interview",
  "offer",
  "rejected",
]);

// PATCH /api/applications/[id] — update editable fields on the caller's own
// application. When stage changes, log a stage_change activity.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    tailored_resume?: unknown;
    cover_letter?: unknown;
    status?: unknown;
    stage?: unknown;
  };

  const update: Record<string, unknown> = {};
  if (body.tailored_resume !== undefined) {
    update.tailored_resume = body.tailored_resume;
  }
  if (typeof body.cover_letter === "string") {
    update.cover_letter = body.cover_letter;
  }
  if (typeof body.status === "string" && STATUSES.has(body.status)) {
    update.status = body.status;
  }
  if (typeof body.stage === "string" && STAGES.has(body.stage)) {
    update.stage = body.stage;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Detect a real stage change before writing (RLS scopes to the owner).
  let stageChanged = false;
  if (update.stage) {
    const { data: current } = await supabase
      .from("applications")
      .select("stage")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!current) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    stageChanged = current.stage !== update.stage;
  }

  const { error } = await supabase
    .from("applications")
    .update(update)
    .eq("id", params.id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  if (stageChanged) {
    await supabase.from("activities").insert({
      user_id: user.id,
      application_id: params.id,
      type: "stage_change",
      body: String(update.stage),
    });
  }

  return NextResponse.json({ ok: true });
}
