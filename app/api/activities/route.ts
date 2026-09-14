import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["note", "followup", "stage_change"]);

// GET /api/activities?application_id=… — activities + outreach for one of the
// caller's applications (backs the drawer).
export async function GET(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const applicationId = new URL(request.url).searchParams.get("application_id");
  if (!applicationId) {
    return NextResponse.json(
      { error: "application_id required" },
      { status: 400 }
    );
  }

  const supabase = await createServerClient();

  const { data: app } = await supabase
    .from("applications")
    .select("id")
    .eq("id", applicationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!app) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [{ data: activities }, { data: outreach }] = await Promise.all([
    supabase
      .from("activities")
      .select("id, type, body, due_at, done, created_at")
      .eq("user_id", user.id)
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("outreach")
      .select("id, contact_name, contact_title, status, sent_at, created_at")
      .eq("user_id", user.id)
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    activities: activities ?? [],
    outreach: outreach ?? [],
  });
}

// POST /api/activities — add a note or follow-up to the caller's application.
export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    application_id?: string;
    type?: string;
    body?: string;
    due_at?: string;
  };

  if (!body.application_id) {
    return NextResponse.json(
      { error: "application_id required" },
      { status: 400 }
    );
  }
  const type = body.type && TYPES.has(body.type) ? body.type : "note";

  const supabase = await createServerClient();

  // Confirm the application belongs to the caller before attaching to it.
  const { data: app } = await supabase
    .from("applications")
    .select("id")
    .eq("id", body.application_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!app) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: inserted, error } = await supabase
    .from("activities")
    .insert({
      user_id: user.id,
      application_id: body.application_id,
      type,
      body: body.body ?? null,
      due_at: body.due_at ?? null,
      done: false,
    })
    .select("id, type, body, due_at, done, created_at")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, activity: inserted });
}
