import { NextResponse } from "next/server";
import { createServerClient, getServerUser } from "@/lib/supabase-server";
import { getStripe, proPriceId } from "@/lib/stripe";
import { siteUrl } from "@/lib/unsub";

export const runtime = "nodejs";

// POST /api/stripe/checkout — start a subscription Checkout for the signed-in
// user. Finds or creates their Stripe customer (persisted on subscriptions),
// then returns the hosted Checkout URL.
export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const priceId = proPriceId();
  if (!priceId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "billing_unconfigured" }, { status: 500 });
  }

  const origin = request.headers.get("origin") || siteUrl();
  const stripe = getStripe();
  const supabase = await createServerClient();

  // Existing customer for this user?
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    // Persist the customer id so the webhook can map events back to the user.
    await supabase
      .from("subscriptions")
      .upsert(
        { user_id: user.id, stripe_customer_id: customerId },
        { onConflict: "user_id" }
      );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
