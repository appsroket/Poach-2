import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase-server";
import { getPlan } from "@/lib/plan";
import { BillingSection } from "@/components/app/BillingSection";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const plan = await getPlan(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">Plan &amp; billing.</p>
      </header>

      <BillingSection plan={plan} />

      <p className="text-xs text-muted/60">
        Profile and email preferences are coming next.
      </p>
    </div>
  );
}
