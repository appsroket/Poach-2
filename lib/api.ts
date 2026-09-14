import { NextResponse } from "next/server";

// Uniform "not implemented yet" response for scaffolded API routes.
// Each route's real logic is filled in by its corresponding build prompt.
export function notImplemented(route: string) {
  return NextResponse.json(
    { error: "not_implemented", route },
    { status: 501 }
  );
}
