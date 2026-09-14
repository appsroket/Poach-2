import Stripe from "stripe";

// Server-side Stripe client. Used in checkout, portal, and webhook routes.
export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
    apiVersion: "2024-06-20",
  });
}
