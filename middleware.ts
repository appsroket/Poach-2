import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Page-route prefixes that require a session.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/jobs",
  "/pipeline",
  "/settings",
  "/onboarding",
];

function matchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase config there's no session to manage — let requests pass
  // so the app still renders (public pages) instead of 500-ing.
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refreshes the session cookie as a side effect. Guarded so a transient
  // Supabase failure degrades to "signed out" instead of 500-ing the route.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  // Build a redirect that preserves any refreshed auth cookies.
  const redirectTo = (pathname: string) => {
    const target = request.nextUrl.clone();
    target.pathname = pathname;
    target.search = "";
    const r = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  const isProtected = PROTECTED_PREFIXES.some((p) => matchesPrefix(path, p));
  const isLogin = path === "/login";

  if (!user) {
    if (isProtected) return redirectTo("/login");
    return response;
  }

  // Authenticated: keep users out of /login.
  if (isLogin) return redirectTo("/dashboard");

  // Authenticated on a protected page: enforce onboarding completion.
  if (isProtected && !matchesPrefix(path, "/onboarding")) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.onboarding_complete) return redirectTo("/onboarding");
    } catch {
      // If the profile lookup fails, don't trap the user — let them through.
    }
  }

  return response;
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
