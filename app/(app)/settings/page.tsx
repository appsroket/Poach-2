import { redirect } from "next/navigation";
import { createServerClient, getServerUser } from "@/lib/supabase-server";
import { getPlan } from "@/lib/plan";
import { BillingSection } from "@/components/app/BillingSection";
import { SettingsProfile } from "@/components/app/SettingsProfile";
import { SettingsResume } from "@/components/app/SettingsResume";
import { SettingsAlerts } from "@/components/app/SettingsAlerts";
import { SignOutButton } from "@/components/app/SignOutButton";
import type { RemotePref, Seniority } from "@/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createServerClient();
  const [{ data: profile }, { data: resume }, plan] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, headline, target_roles, target_locations, remote_pref, seniority, email_optout"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("resumes")
      .select("file_name")
      .eq("user_id", user.id)
      .eq("is_primary", true)
      .maybeSingle(),
    getPlan(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Profile, resume, alerts, and billing.
        </p>
      </header>

      <SettingsProfile
        userId={user.id}
        initial={{
          full_name: profile?.full_name ?? "",
          headline: profile?.headline ?? "",
          target_roles: profile?.target_roles ?? [],
          target_locations: profile?.target_locations ?? [],
          remote_pref: (profile?.remote_pref ?? "any") as RemotePref,
          seniority: (profile?.seniority ?? "") as Seniority | "",
        }}
      />

      <SettingsResume
        userId={user.id}
        initialFileName={resume?.file_name ?? null}
      />

      <SettingsAlerts
        userId={user.id}
        initialOptout={profile?.email_optout ?? false}
      />

      <BillingSection plan={plan} />

      <section className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-6">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">
            Sign out
          </h2>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </div>
        <SignOutButton />
      </section>
    </div>
  );
}
