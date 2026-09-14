import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase-server";
import { findContact } from "@/lib/enrich";

export const runtime = "nodejs";

// POST /api/outreach/find-contact — backs the "Find contact" button. Returns
// { ok, contact } where contact is null until enrichment is wired.
export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    company?: string;
    role?: string;
  };

  const contact = await findContact(body.company ?? "", body.role ?? "");
  return NextResponse.json({ ok: true, contact });
}
