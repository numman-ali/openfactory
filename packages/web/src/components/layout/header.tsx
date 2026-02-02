// SPDX-License-Identifier: AGPL-3.0
import Link from "next/link";
import { Bell, User } from "lucide-react";

interface HeaderProps {
  orgSlug: string;
}

export function Header({ orgSlug }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-4">
        <Link href={`/${orgSlug}`} className="text-lg font-bold tracking-tight">
          OpenFactory
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="User menu"
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
