import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";
import { getPipelineData } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pipeline — the caller's applications (annotated with days-in-stage
// and follow-up status) plus every overdue follow-up.
export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createServerClient();
  const data = await getPipelineData(supabase);
  return NextResponse.json(data);
}
