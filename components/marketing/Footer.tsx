const LINKS = [
  { label: "Support", href: "#" },
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Reddit", href: "#" },
  { label: "TikTok", href: "#" },
  { label: "X", href: "#" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-14">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        <div>
          <span className="font-display text-lg font-bold tracking-tight">
            Poach
          </span>
          <p className="mt-1 text-sm text-muted">
            We find the jobs the job boards don&apos;t.
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded px-1"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-xs text-muted/70">
        © 2026 Poach. All rights reserved.
      </p>
    </footer>
  );
}
