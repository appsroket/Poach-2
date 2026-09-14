"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type Notification = {
  id: string;
  job_id: string | null;
  title: string;
  company: string;
  created_at: string;
};

const POLL_MS = 60_000;

export function NotificationsBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: Notification[];
        unread_count: number;
      };
      setItems(data.notifications ?? []);
      setCount(data.unread_count ?? 0);
    } catch {
      // Ignore — the badge just stays as-is.
    }
  }, []);

  // Fetch on mount, then poll (no websockets needed).
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    // Opening marks everything read (optimistically clear the badge).
    if (next && count > 0) {
      setCount(0);
      try {
        await fetch("/api/notifications/read", { method: "POST" });
      } catch {
        // If it fails, the next poll re-syncs the count.
      }
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
        className="relative rounded-md p-2 text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-base shadow-2xl">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="font-display text-sm font-semibold text-ink">
              Notifications
            </p>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="border-b border-white/5 last:border-0">
                  <Link
                    href={n.job_id ? `/jobs/${n.job_id}` : "/dashboard"}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 transition-colors hover:bg-white/5"
                  >
                    <p className="text-sm text-ink">
                      New match:{" "}
                      <span className="font-medium">{n.title}</span> at{" "}
                      {n.company}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block border-t border-white/10 px-4 py-2.5 text-center text-xs text-accent hover:underline"
          >
            View all matches
          </Link>
        </div>
      )}
    </div>
  );
}
