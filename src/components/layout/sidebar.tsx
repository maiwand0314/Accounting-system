"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Package,
  Receipt,
  BookOpen,
  BarChart3,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";
import { hasPermission, PERMISSIONS } from "@/lib/constants/roles";

const navItems: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}[] = [
  { href: "/dashboard", label: "Oversikt", icon: LayoutDashboard },
  { href: "/fakturaer", label: "Fakturaer", icon: FileText },
  { href: "/produkter", label: "Produkter & lager", icon: Package },
  { href: "/utgifter", label: "Utgifter", icon: Receipt },
  { href: "/bilag", label: "Bilag", icon: BookOpen, roles: PERMISSIONS.postJournal },
  { href: "/kontoplan", label: "Kontoplan", icon: BookOpen, roles: PERMISSIONS.manageChartOfAccounts },
  { href: "/rapporter", label: "Rapporter", icon: BarChart3, roles: PERMISSIONS.viewReports },
  { href: "/brukere", label: "Brukere", icon: Users, roles: PERMISSIONS.manageUsers },
  { href: "/innstillinger", label: "Innstillinger", icon: Settings },
];

export function Sidebar({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          R
        </div>
        <div>
          <p className="text-sm font-semibold">Regnskap</p>
          <p className="text-xs text-muted-foreground">Demo AS</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          if (item.roles && !hasPermission(userRole, item.roles)) return null;
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onMouseEnter={() => router.prefetch(item.href)}
              onFocus={() => router.prefetch(item.href)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
