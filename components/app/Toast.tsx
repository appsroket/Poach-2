"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

// Access the toaster from any client component under <ToastProvider>.
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // No provider (e.g. a component rendered outside the app shell) — no-op.
    return { toast: () => {}, success: () => {}, error: () => {} };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const api: ToastApi = {
    toast,
    success: (m) => toast(m, "success"),
    error: (m) => toast(m, "error"),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:left-auto sm:right-4 sm:translate-x-0"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`cascade pointer-events-auto rounded-xl border px-4 py-2.5 text-sm shadow-lg backdrop-blur ${
              t.kind === "success"
                ? "border-accent/30 bg-accent/15 text-ink"
                : t.kind === "error"
                ? "border-red-500/30 bg-red-500/15 text-ink"
                : "border-white/10 bg-white/10 text-ink"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
