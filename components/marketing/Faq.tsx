"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

const FAQS = [
  {
    q: "How is Poach different from LinkedIn or Indeed?",
    a: "We don't repost job-board listings. Poach pulls openings straight from company career pages and applicant-tracking systems — the roles that often never reach the big boards, or reach them last.",
  },
  {
    q: "Is this just another job board?",
    a: "No. Poach is an agent: it matches roles to your resume, writes each application for you, finds the hiring manager, and tracks every reply in one place.",
  },
  {
    q: "Are these jobs actually real?",
    a: "Yes. Every opening comes directly from the company's own site or ATS, so you won't waste time on ghost listings that were never real.",
  },
  {
    q: "Will it apply to jobs without me?",
    a: "Only when you say so. Poach drafts every application and outreach email; you review and approve before anything is sent.",
  },
  {
    q: "What does it cost?",
    a: "Start with a free preview, no card required. A low monthly subscription unlocks unlimited matching, auto-apply, and pipeline tracking.",
  },
  {
    q: "Is my data safe?",
    a: "Your resume and data are private to your account and never shared. You can export or delete everything at any time.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-5xl">
            Questions, answered.
          </h2>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-12 space-y-3">
            {FAQS.map((item, i) => {
              const isOpen = open === i;
              const panelId = `faq-panel-${i}`;
              const btnId = `faq-btn-${i}`;
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                >
                  <h3>
                    <button
                      id={btnId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      <span className="font-medium text-ink">{item.q}</span>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 shrink-0 text-muted transition-transform duration-300",
                          isOpen && "rotate-180 text-accent"
                        )}
                        aria-hidden
                      />
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                    className={cn(
                      "grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm leading-relaxed text-muted">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
