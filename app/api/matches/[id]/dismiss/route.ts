import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

// POST /api/matches/[id]/dismiss — set the match to 'dismissed' (default) or
// 'saved' when the body carries { save: true }. RLS scopes the update to the
// caller's own match, so a mismatched id simply affects zero rows.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { save?: boolean };
  const status = body.save === true ? "saved" : "dismissed";

  const supabase = await createServerClient();
  const { error } = await supabase
    .from("matches")
    .update({ status })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
