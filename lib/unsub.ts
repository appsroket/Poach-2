import crypto from "crypto";

// Sign/verify unsubscribe links so a click can toggle email_optout without a
// login, but the token can't be forged for another user's id.
function secret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    "poach-dev-unsub-secret"
  );
}

export function signUnsub(userId: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(userId)
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsub(userId: string, token: string): boolean {
  const expected = signUnsub(userId);
  // Constant-time compare on equal-length buffers.
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

// Absolute app base URL (no trailing slash) for links inside emails.
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
