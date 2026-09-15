import Stripe from "stripe";

// Server-side Stripe client. Used in checkout, portal, and webhook routes.
// The API version is pinned so behavior is stable across Stripe upgrades.
export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
    apiVersion: "2024-06-20",
  });
}

// The single recurring price for "Poach Pro" (monthly). Set in the Stripe
// dashboard and exposed via NEXT_PUBLIC_STRIPE_PRICE_ID.
export function proPriceId(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? "";
}

// Map a Stripe subscription status onto our subscriptions.status enum
// (inactive | active | past_due | canceled).
export function mapStripeStatus(
  status: Stripe.Subscription.Status
): "inactive" | "active" | "past_due" | "canceled" {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "inactive";
  }
}

// Pro only while the subscription is active or trialing.
export function planForStatus(
  status: Stripe.Subscription.Status
): "free" | "pro" {
  return status === "active" || status === "trialing" ? "pro" : "free";
}
