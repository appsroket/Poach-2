import { Check, X } from "lucide-react";
import { Reveal } from "./Reveal";

const OLD_WAY = [
  "Posted 1 hour ago · 200+ applicants",
  "Ghost jobs that were never real",
  "Auto-rejected by a bot before a human looks",
  "Recruiter middlemen between you and the team",
  "Apply, pray, hear nothing",
];

const POACH_WAY = [
  "Jobs before they ever hit the boards",
  "Verified openings straight from company sites",
  "Your application, written to match the role",
  "A direct line to the person who actually hires",
  "Every reply tracked in one place",
];

export function ProblemSolution() {
  return (
    <section id="how" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-5xl">
            Two ways to job hunt. Only one gets replies.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <Reveal delay={0}>
            <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
                The old way — LinkedIn / Indeed
              </h3>
              <ul className="mt-6 space-y-4">
                {OLD_WAY.map((row) => (
                  <li key={row} className="flex items-start gap-3 text-muted">
                    <X className="mt-0.5 h-5 w-5 shrink-0 text-white/30" />
                    <span>{row}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="h-full rounded-2xl border border-accent/40 bg-accent/5 p-8 shadow-[0_0_60px_-15px_rgba(124,92,255,0.5)]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
                The Poach way
              </h3>
              <ul className="mt-6 space-y-4">
                {POACH_WAY.map((row) => (
                  <li key={row} className="flex items-start gap-3 text-ink">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span>{row}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
