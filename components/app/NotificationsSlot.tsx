import { Bell } from "lucide-react";

// Placeholder for the notifications bell + dropdown. Wired to real
// notifications in Prompt 11.
export function NotificationsSlot() {
  return (
    <button
      type="button"
      aria-label="Notifications"
      className="rounded-md p-2 text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Bell className="h-5 w-5" />
    </button>
  );
}
