import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@prisma/client";

const CONFIG: Record<
  InvoiceStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" }
> = {
  DRAFT: { label: "Utkast", variant: "secondary" },
  SENT: { label: "Sendt", variant: "default" },
  PAID: { label: "Betalt", variant: "success" },
  OVERDUE: { label: "Forfalt", variant: "warning" },
  CANCELLED: { label: "Kansellert", variant: "outline" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const c = CONFIG[status];
  return <Badge variant={c.variant}>{c.label}</Badge>;
}
