import { redirect } from "next/navigation";
import { createServerClient, getServerUser } from "@/lib/supabase-server";
import { getPipelineData } from "@/lib/pipeline";
import { PipelineBoard } from "@/components/app/PipelineBoard";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const supabase = await createServerClient();
  const data = await getPipelineData(supabase);

  return <PipelineBoard initial={data} />;
}
