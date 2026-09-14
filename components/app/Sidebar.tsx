"use client";

import { NavItem } from "./NavItem";
import { NAV_ITEMS } from "./nav-items";

// Fixed left sidebar, shown at md and up. Hidden on mobile (see MobileTabBar).
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/10 bg-[#0A0A0B] md:flex">
      <div className="flex h-14 items-center border-b border-white/10 px-6">
        <span className="font-display text-lg font-bold tracking-tight text-ink">
          Poach
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>
    </aside>
  );
}
