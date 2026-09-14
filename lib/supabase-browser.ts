import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

// Browser Supabase client (public anon key, RLS-scoped to the signed-in user).
// Never reference the service-role key here.
export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
