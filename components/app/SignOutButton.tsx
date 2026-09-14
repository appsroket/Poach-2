"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase-browser";

export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
    } finally {
      // Hard redirect so middleware re-evaluates with the cleared session.
      window.location.assign("/login");
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      aria-label="Sign out"
      title="Sign out"
      className="rounded-md p-2 text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
}
