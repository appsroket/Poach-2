import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

// POST /api/notifications/read — mark notifications read. Body { ids?: string[] }
// marks that set; omit ids to mark all of the caller's unread notifications.
export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { ids?: string[] };

  const supabase = await createServerClient();
  let query = supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    query = query.in("id", body.ids);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
