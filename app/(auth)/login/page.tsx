"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";

type Status = "idle" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  // Prefill the email when arriving from the landing CTA (/login?email=…).
  // Read on the client after mount to avoid a hydration mismatch.
  useEffect(() => {
    const prefill = new URLSearchParams(window.location.search).get("email");
    if (prefill) setEmail(prefill);
  }, []);

  async function sendMagicLink() {
    if (!email.trim()) {
      setStatus("error");
      setError("Enter your email address.");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/callback` },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function continueWithGoogle() {
    setGoogleLoading(true);
    setError("");
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/callback` },
      });
      if (error) throw error;
      // On success the browser is redirected to Google; nothing else to do.
    } catch (e) {
      setGoogleLoading(false);
      setError(e instanceof Error ? e.message : "Could not start Google sign-in.");
    }
  }

  const busy = status === "sending" || googleLoading;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <a
            href="/"
            className="font-display text-lg font-bold tracking-tight text-ink"
          >
            Poach
          </a>

          <h1 className="mt-10 font-display text-2xl font-bold tracking-tight">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-muted">
            No password needed — we&apos;ll email you a magic link.
          </p>

          {status === "sent" ? (
            <div
              role="status"
              className="mt-8 rounded-2xl border border-accent/40 bg-accent/5 p-5 text-sm text-ink"
            >
              Check your inbox ✉️
              <p className="mt-1 text-muted">
                We sent a magic link to{" "}
                <span className="text-ink">{email.trim()}</span>. Click it to
                finish signing in.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMagicLink();
              }}
              className="mt-8 space-y-4"
              noValidate
            >
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-ink placeholder:text-muted focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(124,92,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Send me a magic link"}
              </button>
            </form>
          )}

          {status !== "sent" && (
            <>
              <div className="my-6 flex items-center gap-4 text-xs text-muted">
                <span className="h-px flex-1 bg-white/10" />
                or
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={continueWithGoogle}
                disabled={busy}
                className="flex w-full items-center justify-center gap-3 rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon />
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </button>
            </>
          )}

          {status === "error" && error && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Right: value-prop panel */}
      <div className="relative hidden overflow-hidden border-l border-white/10 bg-[#0A0A0B] lg:block">
        <div className="pointer-events-none absolute inset-0 dot-grid" aria-hidden />
        <div
          className="glow-orb pointer-events-none absolute right-0 top-1/3 h-[440px] w-[440px] translate-x-1/4 rounded-full"
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-center px-14">
          <p className="text-sm font-medium uppercase tracking-wider text-accent">
            Poach
          </p>
          <h2 className="mt-4 max-w-md font-display text-3xl font-bold leading-[1.1] tracking-tight">
            Land interviews at jobs the other 200 applicants can&apos;t see.
          </h2>
          <p className="mt-4 max-w-md text-muted">
            Poach scrapes the company career pages LinkedIn and Indeed miss,
            matches them to your resume, and applies directly to the hiring
            team — while you sleep.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1 2.6-2.1 3.4v2.8h3.4c2-1.85 3.15-4.56 3.15-7.78 0-.72-.06-1.4-.18-2.05H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.6-2.44l-3.4-2.8c-.94.63-2.15 1-3.2 1-2.46 0-4.55-1.66-5.3-3.9H3.2v2.9C4.83 19.98 8.16 22 12 22z"
      />
      <path
        fill="#4A90D9"
        d="M6.7 13.86c-.2-.6-.3-1.24-.3-1.86s.1-1.26.3-1.86V7.24H3.2C2.53 8.58 2.15 10.24 2.15 12s.38 3.42 1.05 4.76l3.5-2.9z"
      />
      <path
        fill="#FBBC05"
        d="M12 6.24c1.47 0 2.78.5 3.82 1.5l2.86-2.86C16.95 3.22 14.7 2.3 12 2.3 8.16 2.3 4.83 4.32 3.2 7.24l3.5 2.9c.75-2.24 2.84-3.9 5.3-3.9z"
      />
    </svg>
  );
}
