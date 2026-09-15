"use client";

import { useState } from "react";
import { X } from "lucide-react";

// Accessible tag input: type + Enter (or comma) to add, ✕ or Backspace to
// remove. Fully keyboard-operable.
export function ChipInput({
  values,
  onChange,
  placeholder,
  label,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  label?: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (!values.includes(v)) onChange([...values, v]);
    setDraft("");
  }

  function remove(v: string) {
    onChange(values.filter((x) => x !== v));
  }

  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm text-muted">{label}</label>
      )}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-base/60 p-2 focus-within:border-accent/50">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs text-ink"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              aria-label={`Remove ${v}`}
              className="text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && values.length > 0) {
              remove(values[values.length - 1]);
            }
          }}
          onBlur={() => add(draft)}
          placeholder={values.length === 0 ? placeholder : ""}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-ink placeholder:text-muted/60 focus:outline-none"
        />
      </div>
    </div>
  );
}
