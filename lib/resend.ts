// Minimal Resend client over the HTTP API (no SDK dependency). Server only —
// never import into a client component; it reads RESEND_API_KEY.

// Send a plain-text email. Returns false when RESEND_API_KEY is unset (caller
// falls back to clipboard); throws on a non-2xx response so callers can catch
// and fall back too.
export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const from = process.env.RESEND_FROM || "Poach <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`resend ${res.status}: ${detail.slice(0, 200)}`);
  }
  return true;
}
