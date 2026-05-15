import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
}) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p
            className={cn(
              "text-xs mt-1",
              trend === "up" && "text-emerald-600",
              trend === "down" && "text-red-600",
              trend === "neutral" && "text-muted-foreground",
            )}
          >
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
