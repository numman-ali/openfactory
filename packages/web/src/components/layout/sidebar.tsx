// SPDX-License-Identifier: AGPL-3.0
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  Blocks,
  ListChecks,
  MessageSquareWarning,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";

const ICONS = {
  LayoutDashboard,
  FlaskConical,
  Blocks,
  ListChecks,
  MessageSquareWarning,
} as const;

interface SidebarProps {
  orgSlug: string;
  projectSlug: string;
}

const navItems = [
  { label: "Overview", slug: "", icon: "LayoutDashboard" as const },
  { label: "Refinery", slug: "refinery", icon: "FlaskConical" as const },
  { label: "Foundry", slug: "foundry", icon: "Blocks" as const },
  { label: "Planner", slug: "planner", icon: "ListChecks" as const },
  { label: "Validator", slug: "validator", icon: "MessageSquareWarning" as const },
];

export function Sidebar({ orgSlug, projectSlug }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const basePath = "/" + orgSlug + "/" + projectSlug;

  return (
    <aside
      className={"flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 " + (collapsed ? "w-16" : "w-60")}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <Link href={"/" + orgSlug} className="text-sm font-semibold truncate">
            {projectSlug}
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 text-sidebar-foreground/60 hover:bg-accent hover:text-sidebar-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={"h-4 w-4 transition-transform " + (collapsed ? "rotate-180" : "")}
          />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2" aria-label="Module navigation">
        {navItems.map((item) => {
          const href = item.slug ? basePath + "/" + item.slug : basePath;
          const isActive = item.slug
            ? pathname.startsWith(basePath + "/" + item.slug)
            : pathname === basePath;
          const Icon = ICONS[item.icon];

          return (
            <Link
              key={item.slug || "overview"}
              href={href}
              className={"flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors " + (
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-accent/50 hover:text-sidebar-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <Link
          href={basePath + "/settings"}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-accent/50 hover:text-sidebar-foreground"
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
