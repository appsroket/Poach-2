import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase-server";
import { getPlan } from "@/lib/plan";
import { Sidebar } from "@/components/app/Sidebar";
import { MobileTabBar } from "@/components/app/MobileTabBar";
import { SignOutButton } from "@/components/app/SignOutButton";
import { NotificationsSlot } from "@/components/app/NotificationsSlot";
import { UpgradePill } from "@/components/app/UpgradePill";
import { ToastProvider } from "@/components/app/Toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const plan = await getPlan(user.id);

  return (
    <div className="min-h-screen bg-base">
      <Sidebar />
      <MobileTabBar />

      <div className="md:pl-60">
        <header className="flex h-14 items-center justify-between border-b border-white/10 px-6">
          {/* left: breadcrumb slot (filled by pages later) */}
          <div />

          <div className="flex items-center gap-3 sm:gap-4">
            <NotificationsSlot />
            <span className="hidden text-sm text-muted sm:inline">
              {user.email}
            </span>
            {plan === "free" && <UpgradePill />}
            <SignOutButton />
          </div>
        </header>

        {/* pb-24 clears the mobile tab bar; reset at md where it's hidden */}
        <main className="mx-auto max-w-6xl px-6 py-8 pb-24 md:pb-8">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
