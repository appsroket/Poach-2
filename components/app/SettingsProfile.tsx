"use client";

import { useState } from "react";
import { createBrowserClient } from "@/lib/supabase-browser";
import { useToast } from "./Toast";
import { ChipInput } from "./ChipInput";
import type { RemotePref, Seniority } from "@/types";

type ProfileForm = {
  full_name: string;
  headline: string;
  target_roles: string[];
  target_locations: string[];
  remote_pref: RemotePref;
  seniority: Seniority | "";
};

const REMOTE: RemotePref[] = ["any", "remote", "hybrid", "onsite"];
const SENIORITY: Seniority[] = ["intern", "junior", "mid", "senior", "lead"];

export function SettingsProfile({
  userId,
  initial,
}: {
  userId: string;
  initial: ProfileForm;
}) {
  const [form, setForm] = useState<ProfileForm>(initial);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  function set<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const { error: err } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name || null,
          headline: form.headline || null,
          target_roles: form.target_roles,
          target_locations: form.target_locations,
          remote_pref: form.remote_pref,
          seniority: form.seniority || null,
        })
        .eq("id", userId);
      if (err) throw err;
      success("Profile saved.");
    } catch {
      error("Couldn't save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="font-display text-base font-semibold text-ink">Profile</h2>
      <p className="mt-1 text-sm text-muted">
        This shapes which hidden jobs we surface for you.
      </p>

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Headline">
            <input
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              placeholder="Senior Product Designer"
              className={inputCls}
            />
          </Field>
        </div>

        <ChipInput
          label="Target roles"
          values={form.target_roles}
          onChange={(v) => set("target_roles", v)}
          placeholder="Add a role and press Enter"
        />
        <ChipInput
          label="Target locations"
          values={form.target_locations}
          onChange={(v) => set("target_locations", v)}
          placeholder="Add a location and press Enter"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Remote preference">
            <select
              value={form.remote_pref}
              onChange={(e) => set("remote_pref", e.target.value as RemotePref)}
              className={inputCls}
            >
              {REMOTE.map((r) => (
                <option key={r} value={r} className="bg-base capitalize">
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Seniority">
            <select
              value={form.seniority}
              onChange={(e) => set("seniority", e.target.value as Seniority | "")}
              className={inputCls}
            >
              <option value="" className="bg-base">
                Not set
              </option>
              {SENIORITY.map((s) => (
                <option key={s} value={s} className="bg-base capitalize">
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-accent/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </section>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-base/60 px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent/50 focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-muted">{label}</label>
      {children}
    </div>
  );
}
