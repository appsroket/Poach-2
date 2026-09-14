import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client. Uses the public anon key and is always RLS-scoped
// to the signed-in user. Never import the service-role key here.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
