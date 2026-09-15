"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { useToast } from "./Toast";

// Email alert preference: email_optout toggle on the user's profile.
export function SettingsAlerts({
  userId,
  initialOptout,
}: {
  userId: string;
  initialOptout: boolean;
}) {
  const [optout, setOptout] = useState(initialOptout);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  async function toggle() {
    const next = !optout;
    setOptout(next); // optimistic
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const { error: err } = await supabase
        .from("profiles")
        .update({ email_optout: next })
        .eq("id", userId);
      if (err) throw err;
      success(next ? "Daily match emails off." : "Daily match emails on.");
    } catch {
      setOptout(!next); // revert
      error("Couldn't update your preference. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const emailsOn = !optout;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="font-display text-base font-semibold text-ink">Alerts</h2>
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-sm text-muted">
          Daily email digest of new hidden jobs that match you.
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={emailsOn}
          aria-label="Daily match emails"
          onClick={toggle}
          disabled={saving}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base ${
            emailsOn ? "bg-accent" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              emailsOn ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </section>
  );
}
