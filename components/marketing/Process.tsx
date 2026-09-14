import { Reveal } from "./Reveal";

const STEPS = [
  {
    n: "01",
    title: "Upload your resume",
    body: "Drop in your resume once. Poach reads it, learns your target roles, and builds your search profile.",
  },
  {
    n: "02",
    title: "Poach hunts + writes",
    body: "It scans thousands of company sites daily, ranks the best-fit roles, and drafts a tailored application for each.",
  },
  {
    n: "03",
    title: "You approve, we send, you track",
    body: "Review each application in seconds, send it — and watch every reply land in your pipeline.",
  },
];

export function Process() {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-5xl">
            From resume to interview in three steps.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={(i % 3) * 80}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-7">
                <span className="font-display text-3xl font-bold text-accent/70">
                  {s.n}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
