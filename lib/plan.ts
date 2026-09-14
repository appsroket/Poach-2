import { createSupabaseServerClient } from "./supabase-server";

export type Plan = "free" | "pro";

// Reads subscriptions.status to gate matching / generation / outreach.
// Wired to real data in Prompt 12 (billing). Returns "free" by default.
export async function getPlan(userId: string): Promise<Plan> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.status === "active" && data?.plan === "pro") return "pro";
  return "free";
}
