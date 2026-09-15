import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase-server";
import { getStripe, mapStripeStatus, planForStatus } from "@/lib/stripe";

export const runtime = "nodejs";
// Stripe needs the raw, unparsed body to verify the signature.
export const dynamic = "force-dynamic";

// Resolve a customer's user id from its Stripe metadata (fallback when no
// subscriptions row yet carries the customer id).
async function resolveUserId(
  stripe: Stripe,
  customerId: string
): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) {
      return (customer.metadata?.user_id as string) || null;
    }
  } catch {
    // ignore
  }
  return null;
}

// Write subscription state to our DB. The webhook is the ONLY source of truth
// for plan — the client never sets it.
async function syncSubscription(
  stripe: Stripe,
  sub: Stripe.Subscription
): Promise<void> {
  const supabase = createServiceClient();
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const patch = {
    status: mapStripeStatus(sub.status),
    plan: planForStatus(sub.status),
    stripe_subscription_id: sub.id,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
  };

  // Prefer updating the row created at checkout (keyed by customer).
  const { data: updated } = await supabase
    .from("subscriptions")
    .update(patch)
    .eq("stripe_customer_id", customerId)
    .select("id");
  if (updated && updated.length > 0) return;

  // Otherwise resolve the user and upsert a fresh row.
  const userId =
    (sub.metadata?.user_id as string) ||
    (await resolveUserId(stripe, customerId));
  if (!userId) {
    console.error(`[stripe webhook] no user_id for customer ${customerId}`);
    return;
  }
  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      ...patch,
    },
    { onConflict: "user_id" }
  );
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "not_configured" }, { status: 400 });
  }

  const stripe = getStripe();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(stripe, sub);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(stripe, event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe webhook] handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
