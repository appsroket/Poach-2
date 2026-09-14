// Authorize a cron invocation. Accepts, in order:
//  - x-cron-secret header (manual / self-hosted callers)
//  - ?secret= query param (Vercel Cron can't send custom headers)
//  - Authorization: Bearer <secret> (Vercel Cron's built-in header)
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  if (request.headers.get("x-cron-secret") === secret) return true;

  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;

  if (request.headers.get("authorization") === `Bearer ${secret}`) return true;

  return false;
}
