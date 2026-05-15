"use client";

import { Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/server/actions/auth.actions";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { UserRole } from "@prisma/client";

export function Header({
  userName,
  userRole,
}: {
  userName: string;
  userRole: UserRole;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium">{userName}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[userRole]}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Bytt tema"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        <form action={logoutAction}>
          <Button variant="ghost" size="icon" type="submit" aria-label="Logg ut">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
