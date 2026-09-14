import {
  createServerClient as createSSRServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Server Supabase client bound to the request cookies (RLS-scoped to the user).
// Use inside Server Components, Route Handlers, and Server Actions.
//
// Cookie read/write/delete is wired via getAll/setAll — the current
// @supabase/ssr API that covers get, set, and remove without the deprecation
// warnings the individual methods now emit.
export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Accept either the new publishable key or the legacy anon key.
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware
            // refreshes the session cookie instead.
          }
        },
      },
    }
  );
}

// Returns the currently signed-in user, or null (never throws — a missing
// session or unconfigured env resolves to null so callers can redirect).
export async function getServerUser() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// Service-role client. SERVER ONLY — used in cron and privileged server routes.
// Never import this into a client component.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
