"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ExternalLink } from "lucide-react";
import type { PipelineApp } from "@/lib/pipeline";

type Activity = {
  id: string;
  type: string;
  body: string | null;
  due_at: string | null;
  done: boolean;
  created_at: string;
};

type OutreachItem = {
  id: string;
  contact_name: string | null;
  contact_title: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
};

type Tab = "notes" | "followups" | "history";

function fmt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function PipelineDrawer({
  app,
  onClose,
}: {
  app: PipelineApp;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("notes");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [outreach, setOutreach] = useState<OutreachItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [noteText, setNoteText] = useState("");
  const [followText, setFollowText] = useState("");
  const [followDate, setFollowDate] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/activities?application_id=${encodeURIComponent(app.id)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          activities: Activity[];
          outreach: OutreachItem[];
        };
        setActivities(data.activities ?? []);
        setOutreach(data.outreach ?? []);
      }
    } catch {
      // Leave lists empty on failure.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.id]);

  const notes = activities.filter((a) => a.type === "note");
  const followups = activities.filter((a) => a.type === "followup");
  const stageChanges = activities.filter((a) => a.type === "stage_change");

  async function addActivity(type: "note" | "followup") {
    const text = type === "note" ? noteText.trim() : followText.trim();
    if (!text) return;
    setBusy(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: app.id,
          type,
          body: text,
          due_at:
            type === "followup" && followDate
              ? new Date(followDate).toISOString()
              : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        activity?: Activity;
      };
      if (data.ok && data.activity) {
        setActivities((prev) => [data.activity as Activity, ...prev]);
        if (type === "note") setNoteText("");
        else {
          setFollowText("");
          setFollowDate("");
        }
      }
    } catch {
      // no-op
    } finally {
      setBusy(false);
    }
  }

  async function toggleDone(a: Activity) {
    const next = !a.done;
    setActivities((prev) =>
      prev.map((x) => (x.id === a.id ? { ...x, done: next } : x))
    );
    try {
      await fetch(`/api/activities/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      });
    } catch {
      setActivities((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, done: a.done } : x))
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-base p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-ink">
              {app.title}
            </h2>
            <p className="text-sm text-muted">{app.company}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {app.job_id && (
          <Link
            href={`/jobs/${app.job_id}`}
            className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Open job page <ExternalLink className="h-3 w-3" />
          </Link>
        )}

        <div className="mt-4 flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
          {(["notes", "followups", "history"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-3 py-1.5 capitalize transition-colors ${
                tab === t ? "bg-accent text-white" : "text-muted hover:text-ink"
              }`}
            >
              {t === "followups" ? "Follow-ups" : t}
            </button>
          ))}
        </div>

        <div className="mt-4 flex-1">
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : tab === "notes" ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note…"
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => addActivity("note")}
                  disabled={busy || !noteText.trim()}
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {notes.length === 0 ? (
                <p className="text-sm text-muted/70">No notes yet.</p>
              ) : (
                <ul className="space-y-2">
                  {notes.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-ink"
                    >
                      <p className="whitespace-pre-wrap">{n.body}</p>
                      <p className="mt-1 text-xs text-muted/60">
                        {fmt(n.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : tab === "followups" ? (
            <div className="space-y-3">
              <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
                <input
                  value={followText}
                  onChange={(e) => setFollowText(e.target.value)}
                  placeholder="Follow-up reminder…"
                  className="w-full rounded-lg border border-white/10 bg-base/60 px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent/50 focus:outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={followDate}
                    onChange={(e) => setFollowDate(e.target.value)}
                    className="flex-1 rounded-lg border border-white/10 bg-base/60 px-3 py-2 text-sm text-ink focus:border-accent/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => addActivity("followup")}
                    disabled={busy || !followText.trim()}
                    className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
              {followups.length === 0 ? (
                <p className="text-sm text-muted/70">No follow-ups scheduled.</p>
              ) : (
                <ul className="space-y-2">
                  {followups.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={f.done}
                        onChange={() => toggleDone(f)}
                        className="mt-0.5 h-4 w-4 accent-accent"
                      />
                      <div className="min-w-0">
                        <p
                          className={`${
                            f.done ? "text-muted line-through" : "text-ink"
                          }`}
                        >
                          {f.body}
                        </p>
                        {f.due_at && (
                          <p className="mt-0.5 text-xs text-muted/60">
                            Due {fmt(f.due_at)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {stageChanges.length === 0 && outreach.length === 0 ? (
                <p className="text-sm text-muted/70">No history yet.</p>
              ) : (
                <ul className="space-y-2">
                  {stageChanges.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-ink"
                    >
                      Moved to{" "}
                      <span className="font-medium capitalize">{s.body}</span>
                      <span className="ml-2 text-xs text-muted/60">
                        {fmt(s.created_at)}
                      </span>
                    </li>
                  ))}
                  {outreach.map((o) => (
                    <li
                      key={o.id}
                      className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-ink"
                    >
                      Outreach {o.status === "sent" ? "sent" : "drafted"}
                      {o.contact_name ? ` to ${o.contact_name}` : ""}
                      <span className="ml-2 text-xs text-muted/60">
                        {fmt(o.sent_at ?? o.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
