"use client";

import { useState } from "react";
import { Copy, Check, Search, Mail } from "lucide-react";
import { openCheckout } from "@/lib/checkout";
import type { Plan } from "@/lib/plan";

export type OutreachDraft = {
  id: string;
  contact_name: string;
  contact_title: string;
  contact_email: string;
  message: string;
  status: string;
};

// "Reach the hiring manager" — Poach's differentiator. Confirm/enter a contact,
// draft a warm intro email, then send (Resend) or copy for manual send.
export function OutreachPanel({
  plan,
  company,
  role,
  ensureApplication,
  initial,
}: {
  plan: Plan;
  company: string;
  role: string;
  ensureApplication: () => Promise<string | null>;
  initial: OutreachDraft | null;
}) {
  const [name, setName] = useState(initial?.contact_name ?? "");
  const [title, setTitle] = useState(initial?.contact_title ?? "");
  const [email, setEmail] = useState(initial?.contact_email ?? "");

  const [outreachId, setOutreachId] = useState<string | null>(
    initial?.id ?? null
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(initial?.message ?? "");
  const [sent, setSent] = useState(initial?.status === "sent");

  const [finding, setFinding] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const hasDraft = body.trim().length > 0;

  async function find() {
    setFinding(true);
    setNotice("");
    try {
      const res = await fetch("/api/outreach/find-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        contact?: { name?: string; title?: string; email?: string } | null;
      };
      if (data.contact) {
        if (data.contact.name) setName(data.contact.name);
        if (data.contact.title) setTitle(data.contact.title);
        if (data.contact.email) setEmail(data.contact.email);
        setNotice("Contact found.");
      } else {
        setNotice("No contact found yet — enter details manually.");
      }
    } catch {
      setNotice("Lookup failed — enter details manually.");
    } finally {
      setFinding(false);
    }
  }

  async function draft() {
    setDrafting(true);
    setNotice("");
    try {
      const applicationId = await ensureApplication();
      if (!applicationId) {
        setNotice("Couldn't prepare the application. Try again.");
        return;
      }
      const res = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: applicationId,
          contact_name: name,
          contact_title: title,
          contact_email: email,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        outreach_id?: string;
        subject?: string;
        body?: string;
      };
      if (!res.ok || !data.ok) {
        setNotice("Couldn't draft the email. Try again.");
        return;
      }
      setOutreachId(data.outreach_id ?? null);
      setSubject(data.subject ?? "");
      setBody(data.body ?? "");
      setSent(false);
    } catch {
      setNotice("Couldn't draft the email. Try again.");
    } finally {
      setDrafting(false);
    }
  }

  async function send() {
    if (plan === "free") {
      const msg = await openCheckout();
      if (msg) setNotice(msg);
      return;
    }
    if (!outreachId) return;
    setSending(true);
    setNotice("");
    try {
      const res = await fetch(`/api/outreach/${outreachId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        mode?: "email" | "clipboard";
      };
      if (data.error === "upgrade") {
        const msg = await openCheckout();
        if (msg) setNotice(msg);
        return;
      }
      if (!res.ok || !data.ok) {
        setNotice("Couldn't send. Try again.");
        return;
      }
      setSent(true);
      if (data.mode === "clipboard") {
        try {
          await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
        } catch {
          // Clipboard blocked — text stays visible to copy manually.
        }
        setNotice("No email on file — copied so you can send it yourself.");
      } else {
        setNotice("Sent. Follow-up scheduled in 4 days.");
      }
    } catch {
      setNotice("Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function copyBody() {
    try {
      await navigator.clipboard.writeText(
        subject ? `Subject: ${subject}\n\n${body}` : body
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op
    }
  }

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/[0.04] p-5">
      <div className="mb-1 flex items-center gap-2">
        <Mail className="h-4 w-4 text-accent" />
        <h2 className="font-display text-base font-semibold text-ink">
          Reach the hiring manager
        </h2>
      </div>
      <p className="mb-4 text-xs text-muted">
        Skip the queue — a warm, specific intro straight to the person who
        decides.
      </p>

      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contact name"
            className="rounded-lg border border-white/10 bg-base/60 px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent/50 focus:outline-none"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Eng Manager)"
            className="rounded-lg border border-white/10 bg-base/60 px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent/50 focus:outline-none"
          />
        </div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Contact email (optional — enables direct send)"
          className="w-full rounded-lg border border-white/10 bg-base/60 px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-accent/50 focus:outline-none"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={find}
          disabled={finding}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-white/10 disabled:opacity-60"
        >
          <Search className="h-3.5 w-3.5" />
          {finding ? "Searching…" : "Find contact"}
        </button>
        <button
          type="button"
          onClick={draft}
          disabled={drafting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-accent/90 disabled:opacity-60"
        >
          {drafting ? "Drafting…" : hasDraft ? "Redraft intro email" : "Draft intro email"}
        </button>
      </div>

      {hasDraft && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-base/60 px-3 py-2 text-sm text-ink focus:border-accent/50 focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs text-muted">Email body</label>
              <button
                type="button"
                onClick={copyBody}
                className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-ink"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <textarea
              value={body}
              rows={9}
              onChange={(e) => setBody(e.target.value)}
              className="w-full resize-y rounded-lg border border-white/10 bg-base/60 p-2.5 text-sm leading-relaxed text-ink focus:border-accent/50 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-accent/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base"
            >
              {sending
                ? "Sending…"
                : sent
                ? "Send again"
                : plan === "free"
                ? "Upgrade to send"
                : "Send"}
            </button>
            {sent && !notice && (
              <span className="text-xs text-accent">Sent ✓</span>
            )}
          </div>
        </div>
      )}

      {notice && <p className="mt-3 text-xs text-muted">{notice}</p>}
    </div>
  );
}
