import { notFound, redirect } from "next/navigation";
import { createServerClient, getServerUser } from "@/lib/supabase-server";
import { getPlan } from "@/lib/plan";
import { JobDetailClient } from "@/components/app/JobDetailClient";

export const dynamic = "force-dynamic";

type JobRow = {
  id: string;
  title: string;
  location: string | null;
  remote: boolean;
  description: string | null;
  apply_url: string;
  posted_at: string | null;
  company: { name: string | null } | null;
};

export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createServerClient();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, title, location, remote, description, apply_url, posted_at, company:companies ( name )"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!job) notFound();

  const jobRow = job as unknown as JobRow;

  const [{ data: match }, { data: application }, plan] = await Promise.all([
    supabase
      .from("matches")
      .select("score, reasons")
      .eq("job_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("applications")
      .select("id, tailored_resume, cover_letter, status, stage, sent_at")
      .eq("job_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    getPlan(user.id),
  ]);

  const rawReasons = (match?.reasons ?? null) as {
    fit?: string[];
    gaps?: string[];
  } | null;

  const tailored = (application?.tailored_resume ?? null) as {
    bullets?: string[];
  } | null;

  return (
    <JobDetailClient
      userId={user.id}
      plan={plan}
      job={{
        id: jobRow.id,
        title: jobRow.title,
        company_name: jobRow.company?.name ?? "A stealth company",
        location: jobRow.location,
        remote: jobRow.remote,
        description: jobRow.description ?? "",
        apply_url: jobRow.apply_url,
        posted_at: jobRow.posted_at,
      }}
      match={{
        score: match?.score ?? null,
        fit: Array.isArray(rawReasons?.fit) ? rawReasons!.fit! : [],
        gaps: Array.isArray(rawReasons?.gaps) ? rawReasons!.gaps! : [],
      }}
      application={
        application
          ? {
              id: application.id,
              bullets: Array.isArray(tailored?.bullets) ? tailored!.bullets! : [],
              cover_letter: application.cover_letter ?? "",
              status: application.status,
              stage: application.stage,
              sent_at: application.sent_at,
            }
          : null
      }
    />
  );
}
