import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FileWarning,
  Package,
  AlertTriangle,
} from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { DashboardService } from "@/server/services/dashboard/dashboard.service";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateNO, formatNOK } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await requireSession();
  const stats = await DashboardService.getStats(session.companyId);
  const formatted = DashboardService.formatStats(stats);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Oversikt</h1>
        <p className="text-muted-foreground">
          Velkommen, {session.fullName} — {session.company.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title="Inntekter"
          value={formatted.revenueFormatted}
          subtitle="Salgsinntekt hittil i år"
          icon={TrendingUp}
          trend="up"
        />
        <KpiCard
          title="Kostnader"
          value={formatted.expensesFormatted}
          subtitle="Varekostnad og utgifter"
          icon={TrendingDown}
          trend="down"
        />
        <KpiCard
          title="Resultat"
          value={formatted.profitFormatted}
          subtitle="Driftsresultat"
          icon={Wallet}
          trend={stats.profit >= 0 ? "up" : "down"}
        />
        <KpiCard
          title="Utestående fakturaer"
          value={formatted.outstandingFormatted}
          subtitle={`${stats.outstandingCount} fakturaer`}
          icon={FileWarning}
        />
        <KpiCard
          title="Lagerverdi"
          value={formatted.inventoryFormatted}
          subtitle="Basert på vektet kostpris"
          icon={Package}
        />
        <KpiCard
          title="Lavt lager"
          value={String(stats.lowStockCount)}
          subtitle="Produkter under minstenivå"
          icon={AlertTriangle}
          trend={stats.lowStockCount > 0 ? "down" : "neutral"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Siste bilag</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentJournalEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen bilag ennå. Bilag opprettes automatisk fra fakturaer,
                utgifter og lagerbevegelser.
              </p>
            ) : (
              <ul className="space-y-3">
                {stats.recentJournalEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{entry.entryNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatNOK(entry.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateNO(entry.date)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Systemstatus</CardTitle>
            <Badge variant="success">Fase 1 aktiv</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="font-medium">Regnskapsmotor:</span> Dobbel
              bokføring med automatisk balansekontroll er aktivert.
            </p>
            <p>
              <span className="font-medium">Kontoplan:</span> Norsk standard
              (NS 4102-inspirert) er lastet inn.
            </p>
            <p>
              <span className="font-medium">Neste faser:</span> Produkter og
              lager (Fase 2), fakturaer (Fase 3), utgifter og rapporter (Fase
              4).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
