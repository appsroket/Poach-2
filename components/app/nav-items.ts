import {
  LayoutGrid,
  KanbanSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItemData = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Primary app navigation, shared by the sidebar and the mobile tab bar.
export const NAV_ITEMS: NavItemData[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];
