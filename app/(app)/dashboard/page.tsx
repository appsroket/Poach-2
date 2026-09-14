import { redirect } from "next/navigation";
import { createServerClient, getServerUser } from "@/lib/supabase-server";
import { getPlan } from "@/lib/plan";
import { getDashboardMatches } from "@/lib/matches";
import { DashboardClient } from "@/components/app/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createServerClient();
  const [matches, plan] = await Promise.all([
    getDashboardMatches(supabase),
    getPlan(user.id),
  ]);

  return <DashboardClient initialMatches={matches} plan={plan} />;
}
