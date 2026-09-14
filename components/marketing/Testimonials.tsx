import { Star } from "lucide-react";
import { Reveal } from "./Reveal";

const REVIEWS = [
  {
    initials: "MK",
    name: "Maksym K.",
    role: "Software Engineer, Toronto",
    quote:
      "Poach found a role at a startup that never posted anywhere public. I had a call with the founder three days later — after months of grinding LinkedIn with nothing.",
  },
  {
    initials: "KS",
    name: "Kiana S.",
    role: "Marketing Manager, Austin",
    quote:
      "The tailored applications are scary good — it pulled the exact language from the job post. I stopped rewriting my resume for every role and started getting replies.",
  },
  {
    initials: "BN",
    name: "Brian N.",
    role: "SDR, Remote",
    quote:
      "Reaching the hiring manager directly changed everything. Three interviews in my first week, all from intro emails Poach drafted for me.",
  },
];

export function Testimonials() {
  return (
    <section id="reviews" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-5xl">
            Job seekers are already hunting smarter.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <Reveal key={r.name} delay={(i % 3) * 80}>
              <figure className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-7">
                <div className="flex gap-1" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      className="h-4 w-4 fill-accent text-accent"
                      aria-hidden
                    />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink">
                  &ldquo;{r.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
                    {r.initials}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-ink">
                      {r.name}
                    </span>
                    <span className="block text-xs text-muted">{r.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
