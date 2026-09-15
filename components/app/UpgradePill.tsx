"use client";

import { useState } from "react";
import { openCheckout } from "@/lib/checkout";

// Top-bar "Upgrade" pill (free users only). Starts Stripe Checkout.
export function UpgradePill() {
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    const msg = await openCheckout();
    // openCheckout redirects on success; only returns here on failure.
    if (msg) setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
    >
      {busy ? "…" : "Upgrade"}
    </button>
  );
}
