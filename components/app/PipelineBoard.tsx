"use client";

import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { PipelineDrawer } from "./PipelineDrawer";
import {
  PIPELINE_STAGES,
  type PipelineApp,
  type PipelineData,
  type PipelineFollowup,
} from "@/lib/pipeline";
import type { ApplicationStage } from "@/types";

export function PipelineBoard({ initial }: { initial: PipelineData }) {
  const [apps, setApps] = useState<PipelineApp[]>(initial.applications);
  const [followups, setFollowups] = useState<PipelineFollowup[]>(
    initial.followups
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<ApplicationStage | null>(null);
  const [drawerApp, setDrawerApp] = useState<PipelineApp | null>(null);

  // Pull fresh board data (e.g. after the drawer adds a due follow-up).
  async function refresh() {
    try {
      const res = await fetch("/api/pipeline", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as PipelineData;
      setApps(data.applications);
      setFollowups(data.followups);
    } catch {
      // Keep current state on failure.
    }
  }

  const byStage = useMemo(() => {
    const groups: Record<string, PipelineApp[]> = {};
    for (const s of PIPELINE_STAGES) groups[s.key] = [];
    for (const a of apps) (groups[a.stage] ??= []).push(a);
    return groups;
  }, [apps]);

  async function move(id: string, stage: ApplicationStage) {
    const snapshot = apps;
    setApps((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, stage, days_in_stage: 0 } : a
      )
    );
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error("move failed");
    } catch {
      setApps(snapshot); // revert
    }
  }

  function onDrop(stage: ApplicationStage) {
    const id = draggingId;
    setDraggingId(null);
    setOverStage(null);
    if (!id) return;
    const app = apps.find((a) => a.id === id);
    if (app && app.stage !== stage) move(id, stage);
  }

  async function markDone(activityId: string, appId: string) {
    setFollowups((prev) => {
      const next = prev.filter((f) => f.id !== activityId);
      const stillDue = next.some((f) => f.application_id === appId);
      if (!stillDue) {
        setApps((a) =>
          a.map((x) => (x.id === appId ? { ...x, due_followup: false } : x))
        );
      }
      return next;
    });
    try {
      await fetch(`/api/activities/${activityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: true }),
      });
    } catch {
      // Best-effort; a refresh re-surfaces it if the write failed.
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-ink">Pipeline</h1>
        <p className="text-sm text-muted">
          Never lose a lead — drag a card as it moves through your hunt.
        </p>
      </header>

      {followups.length > 0 && (
        <div className="rounded-2xl border border-accent/25 bg-accent/[0.05] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent" />
            <h2 className="font-display text-sm font-semibold text-ink">
              Follow-ups due ({followups.length})
            </h2>
          </div>
          <ul className="space-y-1.5">
            {followups.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate text-muted">
                  <span className="text-ink">{f.company}</span> · {f.role} ·
                  follow up
                </span>
                <button
                  type="button"
                  onClick={() => markDone(f.id, f.application_id)}
                  className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-white/10"
                >
                  Mark done
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="-mx-6 flex snap-x gap-4 overflow-x-auto px-6 pb-2">
        {PIPELINE_STAGES.map((s) => {
          const cards = byStage[s.key] ?? [];
          const active = overStage === s.key;
          return (
            <div
              key={s.key}
              onDragOver={(e) => {
                e.preventDefault();
                if (overStage !== s.key) setOverStage(s.key);
              }}
              onDragLeave={() => setOverStage((o) => (o === s.key ? null : o))}
              onDrop={() => onDrop(s.key)}
              className={`flex w-72 shrink-0 snap-start flex-col rounded-2xl border bg-white/5 p-3 transition-colors ${
                active ? "border-accent/50 bg-accent/[0.06]" : "border-white/10"
              }`}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="font-display text-sm font-semibold text-ink">
                  {s.label}
                </h3>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-muted">
                  {cards.length}
                </span>
              </div>

              <div className="flex min-h-[4rem] flex-col gap-2">
                {cards.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      setDraggingId(a.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", a.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setOverStage(null);
                    }}
                    onClick={() => setDrawerApp(a)}
                    className={`group cursor-grab rounded-xl border border-white/10 bg-base/60 p-3 text-left transition-all hover:border-white/20 active:cursor-grabbing ${
                      draggingId === a.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/90 text-xs font-semibold text-white">
                        {(a.company.trim()[0] ?? "?").toUpperCase()}
                      </span>
                      <span className="truncate text-xs text-muted">
                        {a.company}
                      </span>
                      {a.due_followup && (
                        <span
                          className="ml-auto h-2 w-2 shrink-0 rounded-full bg-accent"
                          title="Follow-up due"
                        />
                      )}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm font-medium text-ink">
                      {a.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {a.days_in_stage} day{a.days_in_stage === 1 ? "" : "s"} in
                      stage
                    </p>
                  </button>
                ))}
                {cards.length === 0 && (
                  <p className="px-1 py-3 text-xs text-muted/60">
                    Nothing here yet.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {drawerApp && (
        <PipelineDrawer
          app={drawerApp}
          onClose={() => {
            setDrawerApp(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
