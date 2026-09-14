import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApplicationStage } from "@/types";

export const PIPELINE_STAGES: { key: ApplicationStage; label: string }[] = [
  { key: "matched", label: "Matched" },
  { key: "applied", label: "Applied" },
  { key: "replied", label: "Replied" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "rejected", label: "Rejected" },
];

export type PipelineApp = {
  id: string;
  job_id: string | null;
  stage: ApplicationStage;
  days_in_stage: number;
  title: string;
  company: string;
  due_followup: boolean;
};

export type PipelineFollowup = {
  id: string; // activity id
  application_id: string;
  company: string;
  role: string;
  due_at: string | null;
};

export type PipelineData = {
  applications: PipelineApp[];
  followups: PipelineFollowup[];
};

type AppRow = {
  id: string;
  stage: string;
  created_at: string;
  job: {
    id: string;
    title: string | null;
    company: { name: string | null } | null;
  } | null;
};

type ActivityRow = {
  id: string;
  application_id: string | null;
  type: string;
  due_at: string | null;
  done: boolean;
  created_at: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Load the caller's applications (RLS-scoped), annotate each with its
// days-in-stage and whether a follow-up is due, and collect every overdue
// follow-up across applications. Shared by the SSR page and GET /api/pipeline.
export async function getPipelineData(
  supabase: SupabaseClient
): Promise<PipelineData> {
  const [{ data: appsRaw }, { data: actsRaw }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, stage, created_at, job:jobs ( id, title, company:companies ( name ) )")
      .order("created_at", { ascending: false }),
    supabase
      .from("activities")
      .select("id, application_id, type, due_at, done, created_at"),
  ]);

  const apps = (appsRaw ?? []) as unknown as AppRow[];
  const acts = (actsRaw ?? []) as unknown as ActivityRow[];
  const now = Date.now();

  // Latest stage_change per application (for days-in-stage).
  const lastStageChange = new Map<string, number>();
  // Whether an overdue, open follow-up exists per application.
  const dueFollowup = new Set<string>();

  for (const a of acts) {
    if (!a.application_id) continue;
    if (a.type === "stage_change") {
      const t = new Date(a.created_at).getTime();
      const prev = lastStageChange.get(a.application_id) ?? 0;
      if (t > prev) lastStageChange.set(a.application_id, t);
    }
    if (
      a.type === "followup" &&
      !a.done &&
      a.due_at &&
      new Date(a.due_at).getTime() <= now
    ) {
      dueFollowup.add(a.application_id);
    }
  }

  const meta = new Map<string, { title: string; company: string }>();
  const applications: PipelineApp[] = apps.map((a) => {
    const title = a.job?.title ?? "Untitled role";
    const company = a.job?.company?.name ?? "A stealth company";
    meta.set(a.id, { title, company });
    const since = lastStageChange.get(a.id) ?? new Date(a.created_at).getTime();
    return {
      id: a.id,
      job_id: a.job?.id ?? null,
      stage: (a.stage ?? "matched") as ApplicationStage,
      days_in_stage: Math.max(0, Math.floor((now - since) / DAY_MS)),
      title,
      company,
      due_followup: dueFollowup.has(a.id),
    };
  });

  const followups: PipelineFollowup[] = acts
    .filter(
      (a) =>
        a.type === "followup" &&
        !a.done &&
        !!a.due_at &&
        new Date(a.due_at!).getTime() <= now &&
        !!a.application_id &&
        meta.has(a.application_id)
    )
    .sort(
      (x, y) =>
        new Date(x.due_at!).getTime() - new Date(y.due_at!).getTime()
    )
    .map((a) => {
      const m = meta.get(a.application_id!)!;
      return {
        id: a.id,
        application_id: a.application_id!,
        company: m.company,
        role: m.title,
        due_at: a.due_at,
      };
    });

  return { applications, followups };
}
