import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

// PATCH /api/activities/[id] — toggle done or edit body/due_at on the caller's
// own activity (RLS-scoped).
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    done?: boolean;
    body?: string;
    due_at?: string | null;
  };

  const update: Record<string, unknown> = {};
  if (typeof body.done === "boolean") update.done = body.done;
  if (typeof body.body === "string") update.body = body.body;
  if (body.due_at !== undefined) update.due_at = body.due_at;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("activities")
    .update(update)
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
