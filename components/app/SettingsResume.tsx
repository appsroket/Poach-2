"use client";

import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { useToast } from "./Toast";

const ACCEPT = ".pdf,.docx";

// Shows the current primary resume and replaces it: uploads the new file,
// demotes prior resumes, inserts the new primary, then re-runs parse + embed.
export function SettingsResume({
  userId,
  initialFileName,
}: {
  userId: string;
  initialFileName: string | null;
}) {
  const [fileName, setFileName] = useState(initialFileName);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".pdf") && !lower.endsWith(".docx")) {
      error("Please upload a PDF or DOCX file.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createBrowserClient();

      const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("resumes")
        .upload(path, file, { upsert: false });
      if (upErr) throw new Error("upload");

      // Demote any existing primary resume(s), then insert the new primary.
      await supabase
        .from("resumes")
        .update({ is_primary: false })
        .eq("user_id", userId)
        .eq("is_primary", true);

      const { data: inserted, error: insErr } = await supabase
        .from("resumes")
        .insert({
          user_id: userId,
          storage_path: path,
          file_name: file.name,
          is_primary: true,
        })
        .select("id")
        .single();
      if (insErr || !inserted) throw new Error("insert");

      // Parse + embed the new resume.
      const res = await fetch("/api/resume/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_id: inserted.id }),
      });
      if (!res.ok) throw new Error("parse");

      setFileName(file.name);
      success("Resume replaced — re-matching against your new resume.");
    } catch {
      error("Couldn't replace your resume. Try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="font-display text-base font-semibold text-ink">Resume</h2>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-muted" />
          <span className="truncate text-sm text-ink">
            {fileName ?? "No resume on file"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-white/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Upload className="h-4 w-4" />
          {busy ? "Uploading…" : "Replace resume"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onFile}
          className="hidden"
        />
      </div>
    </section>
  );
}
