import { NextResponse } from "next/server";

// Supabase Auth callback (magic link / OAuth code exchange) is implemented in
// Prompt 2. This is the route placeholder so the folder structure exists.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`);
}
