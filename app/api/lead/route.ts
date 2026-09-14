import { NextResponse } from "next/server";

// Landing email capture. Validates name + email, forwards the lead as JSON to
// the configured webhook (GHL / Make), and returns { ok: true }.
export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!name || !emailOk) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          source: "poach-landing",
          submitted_at: new Date().toISOString(),
        }),
      });
    } catch {
      // Don't fail the user's submission if the downstream webhook hiccups.
      return NextResponse.json(
        { ok: false, error: "forward_failed" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
