import { NextResponse } from "next/server";
import {
  getServerUser,
  createServerClient,
  createServiceClient,
} from "@/lib/supabase-server";
import { anthropic } from "@/lib/anthropic";
import { embed, toPgVector } from "@/lib/embeddings";

// pdf-parse and mammoth need the Node.js runtime.
export const runtime = "nodejs";

const MAX_TEXT_CHARS = 12000;

type ParsedResume = {
  name?: string;
  headline?: string;
  years_experience?: number;
  skills?: string[];
  titles?: string[];
  summary?: string;
};

// Pull the first balanced-looking JSON object out of a model response,
// tolerating code fences or stray prose.
function extractJson(raw: string): ParsedResume {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(s) as ParsedResume;
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1)) as ParsedResume;
      } catch {
        /* fall through */
      }
    }
    return {};
  }
}

async function extractText(name: string, buffer: Buffer): Promise<string> {
  try {
    if (name.endsWith(".pdf")) {
      const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
      const res = await pdf(buffer);
      return res.text ?? "";
    }
    if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const res = await mammoth.extractRawText({ buffer });
      return res.value ?? "";
    }
  } catch {
    // Corrupt/unreadable file — degrade to empty text.
  }
  return "";
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { resume_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const resumeId = typeof body.resume_id === "string" ? body.resume_id : "";
  if (!resumeId) {
    return NextResponse.json({ error: "missing_resume_id" }, { status: 400 });
  }

  // Load the resume row as the user — RLS guarantees ownership.
  const supabase = await createServerClient();
  const { data: resume } = await supabase
    .from("resumes")
    .select("id, storage_path, file_name")
    .eq("id", resumeId)
    .single();
  if (!resume) {
    return NextResponse.json({ error: "resume_not_found" }, { status: 404 });
  }

  // Download the file with the service-role client (private bucket).
  const service = createServiceClient();
  const { data: blob, error: dlError } = await service.storage
    .from("resumes")
    .download(resume.storage_path);
  if (dlError || !blob) {
    return NextResponse.json({ error: "download_failed" }, { status: 500 });
  }
  const buffer = Buffer.from(await blob.arrayBuffer());

  const fileName = (resume.file_name ?? resume.storage_path).toLowerCase();
  if (!fileName.endsWith(".pdf") && !fileName.endsWith(".docx")) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
  }

  const text = (await extractText(fileName, buffer)).slice(0, MAX_TEXT_CHARS);

  // Structured extraction via Claude — defensive JSON parse, {} on failure.
  let parsed: ParsedResume = {};
  if (text.trim()) {
    try {
      const raw = await anthropic({
        system:
          "You extract structured data from a resume. Return ONLY valid minified JSON, no prose, no code fences.",
        user: `${text}\n\nReturn JSON: { name, headline, years_experience (number), skills (string[]), titles (string[]), summary (2-3 sentences) }.`,
        maxTokens: 1024,
      });
      parsed = extractJson(raw);
    } catch {
      parsed = {};
    }
  }

  // Persist parsed data.
  await supabase.from("resumes").update({ parsed }).eq("id", resume.id);

  // Build embedding text and store the vector (best-effort).
  try {
    const embedText = [
      parsed.headline,
      Array.isArray(parsed.titles) ? parsed.titles.join(" ") : "",
      Array.isArray(parsed.skills) ? parsed.skills.join(" ") : "",
      parsed.summary,
    ]
      .filter(Boolean)
      .join("\n");
    if (embedText.trim()) {
      const vector = await embed(embedText);
      await supabase
        .from("resumes")
        .update({ embedding: toPgVector(vector) })
        .eq("id", resume.id);
    }
  } catch {
    // Embedding is non-fatal; parsed data is already saved.
  }

  return NextResponse.json({ ok: true, parsed });
}
