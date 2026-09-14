import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";
import { getPlan } from "@/lib/plan";
import { getDashboardMatches } from "@/lib/matches";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/matches — the signed-in user's active matches (status new|saved),
// joined to jobs + companies, ranked by score desc, plus their plan + total.
export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createServerClient();
  const [matches, plan] = await Promise.all([
    getDashboardMatches(supabase),
    getPlan(user.id),
  ]);

  return NextResponse.json({
    matches,
    plan,
    total: matches.length,
  });
}
