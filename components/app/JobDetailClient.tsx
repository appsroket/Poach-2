"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Sparkles } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { openCheckout } from "@/lib/checkout";
import { ScoreRing } from "./ScoreRing";
import { OutreachPanel, type OutreachDraft } from "./OutreachPanel";
import type { Plan } from "@/lib/plan";
import type { ApplicationStage, ApplicationStatus } from "@/types";

type JobProps = {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  remote: boolean;
  description: string;
  apply_url: string;
  posted_at: string | null;
};

type MatchProps = { score: number | null; fit: string[]; gaps: string[] };

type ApplicationProps = {
  id: string;
  bullets: string[];
  cover_letter: string;
  status: ApplicationStatus;
  stage: ApplicationStage;
  sent_at: string | null;
};

// Deterministic date (identical on server + client) to avoid hydration drift.
function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function JobDetailClient({
  userId,
  plan,
  job,
  match,
  application,
  outreach,
}: {
  userId: string;
  plan: Plan;
  job: JobProps;
  match: MatchProps;
  application: ApplicationProps | null;
  outreach: OutreachDraft | null;
}) {
  const [appId, setAppId] = useState<string | null>(application?.id ?? null);
  const [bullets, setBullets] = useState<string[]>(application?.bullets ?? []);
  const [cover, setCover] = useState(application?.cover_letter ?? "");
  const [status, setStatus] = useState<ApplicationStatus>(
    application?.status ?? "draft"
  );
  const [stage, setStage] = useState<ApplicationStage>(
    application?.stage ?? "matched"
  );

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState<"bullets" | "cover" | null>(null);

  const generated = bullets.length > 0 || cover.trim().length > 0;
  const postedLabel = fmtDate(job.posted_at);

  async function generate() {
    setGenerating(true);
    setNotice("");
    try {
      const res = await fetch("/api/applications/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        application_id?: string;
        tailored_bullets?: string[];
        cover_letter?: string;
      };
      if (data.error === "upgrade") {
        const msg = await openCheckout();
        if (msg) setNotice(msg);
        return;
      }
      if (data.error === "no_resume") {
        setNotice("Upload a resume in onboarding first, then generate.");
        return;
      }
      if (!res.ok || !data.ok) {
        setNotice("Generation failed. Please try again.");
        return;
      }
      setAppId(data.application_id ?? null);
      setBullets(data.tailored_bullets ?? []);
      setCover(data.cover_letter ?? "");
      setStatus("draft");
    } catch {
      setNotice("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!appId) return;
    setSaving(true);
    setNotice("");
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tailored_resume: { bullets },
          cover_letter: cover,
        }),
      });
      setNotice(res.ok ? "Saved." : "Couldn't save. Try again.");
    } catch {
      setNotice("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    if (!appId) return;
    setNotice("");
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (res.ok) {
        setStatus("approved");
        setNotice("Approved.");
      }
    } catch {
      setNotice("Couldn't approve. Try again.");
    }
  }

  // Ensure an application row exists (create if none). Returns its id, or null
  // on failure. Shared by Apply and the outreach panel.
  async function ensureApplication(): Promise<string | null> {
    if (appId) return appId;
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("applications")
      .insert({
        user_id: userId,
        job_id: job.id,
        status: "draft",
        stage: "matched",
      })
      .select("id")
      .single();
    if (error || !data) return null;
    setAppId(data.id);
    return data.id;
  }

  // Open the real posting, then record the application as applied.
  async function apply() {
    window.open(job.apply_url, "_blank", "noopener,noreferrer");
    setApplying(true);
    try {
      const id = await ensureApplication();
      if (!id) {
        setNotice("Couldn't record the application.");
        return;
      }
      const res = await fetch(`/api/applications/${id}/send`, {
        method: "POST",
      });
      if (res.ok) setStage("applied");
    } catch {
      setNotice("Couldn't record the application.");
    } finally {
      setApplying(false);
    }
  }

  async function copy(which: "bullets" | "cover", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied((c) => (c === which ? null : c)), 1500);
    } catch {
      // Clipboard blocked — no-op.
    }
  }

  const badge = job.remote ? "Remote" : job.location?.trim() || "Location undisclosed";

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      {/* Left: job */}
      <div className="space-y-5 lg:col-span-3">
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-ink">
            {job.title}
          </h1>
          <p className="text-sm text-muted">{job.company_name}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5">
              {badge}
            </span>
            {postedLabel && <span>Posted {postedLabel}</span>}
            {stage === "applied" && (
              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-accent">
                Applied
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={apply}
          disabled={applying}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-accent/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
        >
          {applying ? "Opening…" : "Apply"}
          <ExternalLink className="h-4 w-4" />
        </button>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 font-display text-sm font-semibold text-ink">
            Job description
          </h2>
          {job.description.trim() ? (
            <div className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {job.description}
            </div>
          ) : (
            <p className="text-sm text-muted">
              No description was published for this role.
            </p>
          )}
        </div>
      </div>

      {/* Right: application */}
      <div className="space-y-5 lg:col-span-2">
        <ContextHeader match={match} />

        {!generated ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-accent" />
            <h2 className="mt-3 font-display text-base font-semibold text-ink">
              Your application
            </h2>
            <p className="mt-1 text-sm text-muted">
              We&apos;ll tailor your real experience to this exact role — no
              invented history.
            </p>
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-accent/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
            >
              {generating ? "Tailoring your application…" : "Generate my application"}
            </button>
            {notice && <p className="mt-3 text-xs text-muted">{notice}</p>}
          </div>
        ) : (
          <div className="space-y-5">
            <Block
              title="Tailored resume bullets"
              onCopy={() => copy("bullets", bullets.join("\n"))}
              copied={copied === "bullets"}
            >
              <div className="space-y-2">
                {bullets.map((b, i) => (
                  <textarea
                    key={i}
                    value={b}
                    rows={2}
                    onChange={(e) =>
                      setBullets((prev) =>
                        prev.map((v, j) => (j === i ? e.target.value : v))
                      )
                    }
                    className="w-full resize-y rounded-lg border border-white/10 bg-base/60 p-2.5 text-sm text-ink focus:border-accent/50 focus:outline-none"
                  />
                ))}
              </div>
            </Block>

            <Block
              title="Cover letter"
              onCopy={() => copy("cover", cover)}
              copied={copied === "cover"}
            >
              <textarea
                value={cover}
                rows={10}
                onChange={(e) => setCover(e.target.value)}
                className="w-full resize-y rounded-lg border border-white/10 bg-base/60 p-2.5 text-sm leading-relaxed text-ink focus:border-accent/50 focus:outline-none"
              />
            </Block>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-white/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={approve}
                disabled={status === "approved"}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-accent/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
              >
                {status === "approved" ? "Approved ✓" : "Approve"}
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-60"
              >
                {generating ? "Regenerating…" : "Regenerate"}
              </button>
              {notice && <span className="text-xs text-muted">{notice}</span>}
            </div>
          </div>
        )}

        <OutreachPanel
          plan={plan}
          company={job.company_name}
          role={job.title}
          ensureApplication={ensureApplication}
          initial={outreach}
        />
      </div>
    </div>
  );
}

function ContextHeader({ match }: { match: MatchProps }) {
  const hasContext =
    match.score != null || match.fit.length > 0 || match.gaps.length > 0;
  if (!hasContext) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        {match.score != null && <ScoreRing value={match.score} size={48} />}
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-ink">
            Why we surfaced this
          </p>
          <p className="text-xs text-muted">Grounded in your resume.</p>
        </div>
      </div>
      {match.fit.length > 0 && (
        <ul className="mt-3 space-y-1">
          {match.fit.map((f, i) => (
            <li key={i} className="flex gap-2 text-xs text-ink/80">
              <span className="text-accent">+</span>
              {f}
            </li>
          ))}
        </ul>
      )}
      {match.gaps.length > 0 && (
        <ul className="mt-2 space-y-1">
          {match.gaps.map((g, i) => (
            <li key={i} className="flex gap-2 text-xs text-muted">
              <span>△</span>
              {g}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Block({
  title,
  onCopy,
  copied,
  children,
}: {
  title: string;
  onCopy: () => void;
  copied: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-ink"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {children}
    </div>
  );
}
