import { cn } from "@/lib/utils";

// Standard POACH card: bg-white/5 border border-white/10 rounded-2xl.
export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/5", className)}>
      {children}
    </div>
  );
}
