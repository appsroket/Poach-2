import { NextResponse, type NextRequest } from "next/server";

// Session refresh + route protection is implemented in Prompt 2 (Supabase
// Auth via @supabase/ssr). This scaffold passes requests through unchanged
// so the app builds and runs before auth is wired up.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Run on app routes, excluding static assets and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
