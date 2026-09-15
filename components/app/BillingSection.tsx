"use client";

import { useState } from "react";
import { openCheckout } from "@/lib/checkout";
import type { Plan } from "@/lib/plan";

// Upgrade-to-Pro / manage-billing card for Settings. Free users start Checkout;
// Pro users open the Stripe billing portal to update or cancel.
export function BillingSection({ plan }: { plan: Plan }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upgrade() {
    setBusy(true);
    setError("");
    const msg = await openCheckout();
    if (msg) {
      setError(msg);
      setBusy(false);
    }
  }

  async function manage() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Couldn't open billing. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">
            {plan === "pro" ? "Poach Pro" : "Upgrade to Pro"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {plan === "pro"
              ? "You're on Pro — every match, unlimited applications, and direct outreach."
              : "Unlock all your matches, unlimited tailored applications, and hiring-manager outreach."}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            plan === "pro"
              ? "bg-accent/15 text-accent"
              : "border border-white/15 text-muted"
          }`}
        >
          {plan === "pro" ? "Pro" : "Free"}
        </span>
      </div>

      <div className="mt-4">
        {plan === "pro" ? (
          <button
            type="button"
            onClick={manage}
            disabled={busy}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-white/10 disabled:opacity-60"
          >
            {busy ? "Opening…" : "Manage billing"}
          </button>
        ) : (
          <button
            type="button"
            onClick={upgrade}
            disabled={busy}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-accent/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
          >
            {busy ? "Starting checkout…" : "Upgrade to Pro"}
          </button>
        )}
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    </section>
  );
}
