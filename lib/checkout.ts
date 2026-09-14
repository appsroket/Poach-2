// Client helper: start a Stripe checkout and redirect. Returns a message
// string when it can't redirect (checkout unavailable / error), else "".
export async function openCheckout(): Promise<string> {
  try {
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { url?: string };
    if (data.url) {
      window.location.href = data.url;
      return "";
    }
    return "Checkout isn't available yet. Please try again shortly.";
  } catch {
    return "Something went wrong starting checkout.";
  }
}
