import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  match_id: string | null;
  read: boolean;
  created_at: string;
  match: {
    job: {
      id: string;
      title: string | null;
      company: { name: string | null } | null;
    } | null;
  } | null;
};

// GET /api/notifications — the caller's recent unread notifications (joined to
// the matched job + company) and an exact unread count for the bell badge.
export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createServerClient();

  const [{ data: rows }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        "id, match_id, read, created_at, match:matches ( job:jobs ( id, title, company:companies ( name ) ) )"
      )
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false),
  ]);

  const notifications = ((rows ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    match_id: r.match_id,
    read: r.read,
    created_at: r.created_at,
    job_id: r.match?.job?.id ?? null,
    title: r.match?.job?.title ?? "a new role",
    company: r.match?.job?.company?.name ?? "a stealth company",
  }));

  return NextResponse.json({
    notifications,
    unread_count: count ?? notifications.length,
  });
}
