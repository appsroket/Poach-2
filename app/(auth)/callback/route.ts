import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// OAuth / magic-link callback. Exchanges the code for a session, then routes
// by onboarding state. On any failure, back to /login?error=auth.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createServerClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  const destination = profile?.onboarding_complete ? "/dashboard" : "/onboarding";
  return NextResponse.redirect(`${origin}${destination}`);
}
