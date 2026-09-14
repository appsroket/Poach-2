import {
  Eye,
  Target,
  PenLine,
  Mail,
  KanbanSquare,
  BellRing,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "./Reveal";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Eye,
    title: "See Jobs Before Anyone Else",
    body: "Poach reads company career pages and ATS feeds every day, surfacing openings the job boards haven't indexed yet.",
  },
  {
    icon: Target,
    title: "Only the Jobs That Actually Fit",
    body: "Your resume is embedded and scored against every role, so you only see matches worth your time — with the reasons why.",
  },
  {
    icon: PenLine,
    title: "Applications Written For You",
    body: "Poach tailors your resume and a cover letter to each posting, mirroring the role's language before you hit send.",
  },
  {
    icon: Mail,
    title: "Reach the Hiring Manager Directly",
    body: "It surfaces the person who owns the role and drafts a short intro email, skipping the recruiter queue entirely.",
  },
  {
    icon: KanbanSquare,
    title: "Never Lose Track of a Lead",
    body: "Every application flows through a built-in CRM board from matched to offer, with follow-up reminders baked in.",
  },
  {
    icon: BellRing,
    title: "Be First, Not 201st",
    body: "Fresh matches trigger instant alerts so you apply within the first hour — not after 200 other people already did.",
  },
];

export function Features() {
  return (
    <section id="features" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-bold leading-[1.05] tracking-tight md:text-5xl">
            An agent that finds the job and does the applying.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <div className="group h-full rounded-2xl border border-white/10 bg-white/5 p-7 transition-colors hover:border-white/20">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <Icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="mt-5 font-display text-lg font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {f.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
