import { createServiceClient } from "@/lib/supabase-server";
import { verifyUnsub } from "@/lib/unsub";

export const runtime = "nodejs";

function page(title: string, message: string): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#0A0A0B;color:#EDEDEF;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif"><div style="max-width:480px;margin:16vh auto;padding:0 24px;text-align:center"><h1 style="font-size:20px;margin:0 0 8px">${title}</h1><p style="color:#A1A1AA;margin:0">${message}</p></div></body></html>`;
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// GET /api/unsubscribe?u=<user_id>&t=<token> — one-click email opt-out from a
// digest footer. Verifies the signed token, then sets email_optout = true.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";

  if (!userId || !token || !verifyUnsub(userId, token)) {
    return page("Invalid link", "This unsubscribe link is invalid or expired.");
  }

  try {
    const supabase = createServiceClient();
    await supabase
      .from("profiles")
      .update({ email_optout: true })
      .eq("id", userId);
  } catch {
    return page("Something went wrong", "Please try again in a moment.");
  }

  return page(
    "You're unsubscribed",
    "You won't get daily match emails anymore. You can re-enable them anytime in Settings."
  );
}
