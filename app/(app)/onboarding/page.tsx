"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, FileText, X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

type RemotePref = "any" | "remote" | "hybrid" | "onsite";
type Seniority = "intern" | "junior" | "mid" | "senior" | "lead";

const ACCEPTED = [".pdf", ".docx"];
const REMOTE_OPTIONS: RemotePref[] = ["any", "remote", "hybrid", "onsite"];
const SENIORITY_OPTIONS: Seniority[] = [
  "intern",
  "junior",
  "mid",
  "senior",
  "lead",
];

function hasAcceptedExtension(name: string) {
  const lower = name.toLowerCase();
  return ACCEPTED.some((ext) => lower.endsWith(ext));
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1 state
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Step 2 state
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetLocations, setTargetLocations] = useState<string[]>([]);
  const [remotePref, setRemotePref] = useState<RemotePref>("any");
  const [seniority, setSeniority] = useState<Seniority>("mid");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(file: File) {
    setUploadError("");
    if (!hasAcceptedExtension(file.name)) {
      setUploadError("Please upload a PDF or DOCX file.");
      return;
    }
    if (!userId) {
      setUploadError("Still loading your session — try again in a moment.");
      return;
    }

    setFileName(file.name);
    setParsing(true);
    try {
      const path = `${userId}/${crypto.randomUUID()}-${file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from("resumes")
        .upload(path, file, { upsert: false });
      if (uploadErr) throw new Error("We couldn't upload that file. Try again.");

      const { data: row, error: insertErr } = await supabase
        .from("resumes")
        .insert({
          user_id: userId,
          storage_path: path,
          file_name: file.name,
          is_primary: true,
        })
        .select("id")
        .single();
      if (insertErr || !row) throw new Error("Couldn't save your resume record.");

      const res = await fetch("/api/resume/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_id: row.id }),
      });
      if (!res.ok) throw new Error("We couldn't read your resume. Try again.");

      const { parsed } = (await res.json()) as {
        parsed?: { titles?: string[] };
      };
      if (Array.isArray(parsed?.titles) && parsed.titles.length) {
        setTargetRoles(
          Array.from(new Set(parsed.titles.filter(Boolean))).slice(0, 8)
        );
      }
      setStep(2);
    } catch (e) {
      setUploadError(
        e instanceof Error ? e.message : "Something went wrong. Try again."
      );
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  async function startHunting() {
    if (!userId) return;
    setSaving(true);
    setSaveError("");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          target_roles: targetRoles,
          target_locations: targetLocations,
          remote_pref: remotePref,
          seniority,
          onboarding_complete: true,
        })
        .eq("id", userId);
      if (error) throw error;
      router.push("/dashboard");
    } catch (e) {
      setSaving(false);
      setSaveError(
        e instanceof Error ? e.message : "Couldn't save your preferences."
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className={cn(step === 1 && "text-accent")}>1. Resume</span>
        <span className="h-px w-8 bg-white/15" />
        <span className={cn(step === 2 && "text-accent")}>2. Preferences</span>
        <span className="ml-auto text-xs">Step {step} of 2</span>
      </div>

      {step === 1 ? (
        <section className="mt-8">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Add your resume
          </h1>
          <p className="mt-2 text-sm text-muted">
            We&apos;ll read it and pre-fill your search. PDF or DOCX.
          </p>

          {parsing ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="text-sm text-ink">Reading your resume…</p>
              {fileName && (
                <p className="text-xs text-muted">{fileName}</p>
              )}
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center transition-colors",
                dragging
                  ? "border-accent/60 bg-accent/5"
                  : "border-white/15 bg-white/5"
              )}
            >
              <UploadCloud className="h-7 w-7 text-muted" />
              <p className="text-sm text-ink">
                Drag &amp; drop your resume here
              </p>
              <p className="text-xs text-muted">or</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
              >
                Choose a file
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {uploadError && (
            <div
              role="alert"
              className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400"
            >
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={() => {
                  setUploadError("");
                  inputRef.current?.click();
                }}
                className="shrink-0 font-medium text-ink underline-offset-2 hover:underline"
              >
                Retry
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-8">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            What are you looking for?
          </h1>
          <p className="mt-2 text-sm text-muted">
            We pre-filled what we could. Tweak anything.
          </p>

          <div className="mt-8 space-y-8">
            <ChipInput
              label="Target roles"
              placeholder="e.g. Software Engineer"
              values={targetRoles}
              onChange={setTargetRoles}
            />
            <ChipInput
              label="Target locations"
              placeholder="e.g. Remote, Toronto"
              values={targetLocations}
              onChange={setTargetLocations}
            />

            <div>
              <span className="mb-2 block text-sm font-medium text-ink">
                Remote preference
              </span>
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                {REMOTE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setRemotePref(opt)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      remotePref === opt
                        ? "bg-accent text-white"
                        : "text-muted hover:text-ink"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="seniority"
                className="mb-2 block text-sm font-medium text-ink"
              >
                Seniority
              </label>
              <select
                id="seniority"
                value={seniority}
                onChange={(e) => setSeniority(e.target.value as Seniority)}
                className="w-full max-w-xs rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-ink capitalize focus-visible:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {SENIORITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-base capitalize">
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {saveError && (
            <p role="alert" className="mt-6 text-sm text-red-400">
              {saveError}
            </p>
          )}

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Back
            </button>
            <button
              type="button"
              onClick={startHunting}
              disabled={saving}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Start hunting"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function ChipInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-ink">{label}</span>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        {values.map((value, i) => (
          <span
            key={`${value}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-sm text-ink"
          >
            {value}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove ${value}`}
              className="text-muted hover:text-ink focus-visible:outline-none"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          placeholder={values.length ? "" : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && values.length) {
              remove(values.length - 1);
            }
          }}
          onBlur={() => add(draft)}
          className="min-w-[8rem] flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </div>
    </div>
  );
}
