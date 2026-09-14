export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-6 pb-24 pt-36 md:pb-32 md:pt-44"
    >
      {/* Background: dot grid + violet glow orb */}
      <div className="pointer-events-none absolute inset-0 dot-grid" aria-hidden />
      <div
        className="glow-orb pointer-events-none absolute left-1/2 top-24 h-[520px] w-[520px] -translate-x-1/2 rounded-full"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
        <div className="cascade" style={{ animationDelay: "0ms" }}>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-muted">
            As seen on Reddit &amp; TikTok · 4.5M hidden jobs indexed
          </span>
        </div>

        <h1
          className="cascade mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
          style={{ animationDelay: "100ms" }}
        >
          Land Interviews at Jobs the Other 200 Applicants{" "}
          <span className="text-accent">Can&apos;t See</span>
        </h1>

        <p
          className="cascade mt-6 max-w-2xl text-lg text-muted"
          style={{ animationDelay: "200ms" }}
        >
          Poach scrapes the company career pages LinkedIn and Indeed miss,
          matches them to your resume, and applies directly to the hiring team
          — while you sleep.
        </p>

        <div
          className="cascade mt-8 flex flex-col items-center gap-3 sm:flex-row"
          style={{ animationDelay: "300ms" }}
        >
          <a
            href="#cta"
            className="rounded-full bg-accent px-6 py-3 text-base font-medium text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_40px_rgba(124,92,255,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base active:translate-y-0"
          >
            Find My Hidden Jobs →
          </a>
          <a
            href="#how"
            className="rounded-full border border-white/15 px-6 py-3 text-base font-medium text-ink transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
          >
            See How It Works
          </a>
        </div>

        <p
          className="cascade mt-4 text-sm text-muted"
          style={{ animationDelay: "400ms" }}
        >
          Free preview · No card required
        </p>

        <p
          className="cascade mt-10 text-sm text-muted"
          style={{ animationDelay: "500ms" }}
        >
          ⭐ 4.9 from 8,573 job seekers · 4.5M jobs · 12,000+ companies
        </p>
      </div>
    </section>
  );
}
