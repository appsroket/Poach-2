import { createServerClient } from "./supabase-server";

export type Plan = "free" | "pro";

// Reads the user's subscription status. 'pro' when status = 'active',
// otherwise 'free'. Gates matching / generation / outreach in later prompts.
export async function getPlan(userId: string): Promise<Plan> {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.status === "active" ? "pro" : "free";
  } catch {
    return "free";
  }
}

export async function isPro(userId: string): Promise<boolean> {
  return (await getPlan(userId)) === "pro";
}
