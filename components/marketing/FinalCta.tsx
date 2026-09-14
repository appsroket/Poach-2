"use client";

import { useState } from "react";
import { Reveal } from "./Reveal";

type Status = "idle" | "loading" | "success" | "error";

export function FinalCta() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function submit() {
    if (!name.trim() || !email.trim()) {
      setStatus("error");
      setMessage("Please enter your name and email.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("success");
      setMessage("You're in. Your free preview updates today.");
      setName("");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <section id="cta" className="relative overflow-hidden px-6 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 dot-grid" aria-hidden />
      <div
        className="glow-orb pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        aria-hidden
      />

      <Reveal className="relative mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-5xl">
          Your next job is already posted — just not where everyone&apos;s
          looking.
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="mx-auto mt-10 flex max-w-md flex-col gap-3"
          noValidate
        >
          <label htmlFor="cta-name" className="sr-only">
            Your name
          </label>
          <input
            id="cta-name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-ink placeholder:text-muted focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <label htmlFor="cta-email" className="sr-only">
            Email address
          </label>
          <input
            id="cta-email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-ink placeholder:text-muted focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-full bg-accent px-6 py-3 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(124,92,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Finding your jobs…" : "Find My Hidden Jobs →"}
          </button>

          <p
            aria-live="polite"
            className={
              status === "error"
                ? "min-h-5 text-sm text-red-400"
                : status === "success"
                  ? "min-h-5 text-sm text-accent"
                  : "min-h-5 text-sm text-muted"
            }
          >
            {message || "Free preview updates today."}
          </p>
        </form>
      </Reveal>
    </section>
  );
}
