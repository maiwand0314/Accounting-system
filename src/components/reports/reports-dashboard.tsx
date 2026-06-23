import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/roles";
import { ReportsService } from "@/server/services/reports/reports.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNOK } from "@/lib/utils";
import { GeneralLedgerPreview } from "./general-ledger-preview";
import { BalanceSheetSection } from "./balance-sheet-section";

function SectionSkeleton({ height = "h-40" }: { height?: string }) {
  return <div className={`${height} animate-pulse rounded-xl bg-muted`} />;
}

export async function ReportsDashboard() {
  const session = await requireRole(PERMISSIONS.viewReports);
  const year = new Date().getFullYear();
  const [data, trialBalance] = await Promise.all([
    ReportsService.getDashboardReports(session.companyId),
    ReportsService.getTrialBalance(session.companyId),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold">Resultatregnskap {year}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Inntekter</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">
                {formatNOK(data.pl.revenue)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Kostnader</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatNOK(data.pl.expenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Resultat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatNOK(data.pl.profit)}</p>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-4">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-2">Konto</th>
                  <th className="px-4 py-2 text-right">Beløp</th>
                </tr>
              </thead>
              <tbody>
                {data.pl.rows.map((r) => (
                  <tr key={r.account.id} className="border-b border-border">
                    <td className="px-4 py-2">
                      {r.account.code} — {r.account.name}
                    </td>
                    <td className="px-4 py-2 text-right">{formatNOK(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <Suspense fallback={<SectionSkeleton height="h-56" />}>
        <BalanceSheetSection companyId={session.companyId} />
      </Suspense>

      <section>
        <h2 className="mb-4 text-lg font-semibold">MVA-oppstilling {year}</h2>
        <Card>
          <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Utgående MVA</p>
              <p className="text-xl font-bold">{formatNOK(data.vat.outputVat)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inngående MVA</p>
              <p className="text-xl font-bold">{formatNOK(data.vat.inputVat)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Å betale (netto)</p>
              <p className="text-xl font-bold">{formatNOK(data.vat.netPayable)}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lagerverdi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNOK(data.inventory.inventoryValue)}</p>
            <p className="text-sm text-muted-foreground">
              {data.inventory.productCount} produkter · {data.inventory.lowStockCount} lavt lager
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Utestående fakturaer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNOK(data.outstanding.total)}</p>
            <p className="text-sm text-muted-foreground">
              {data.outstanding.count} åpne fakturaer
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Utgiftsrapport {year}</h2>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-2">Konto</th>
                  <th className="px-4 py-2 text-right">Sum</th>
                </tr>
              </thead>
              <tbody>
                {data.expenseSummary.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                      Ingen utgifter
                    </td>
                  </tr>
                ) : (
                  data.expenseSummary.map((r) => (
                    <tr key={r.code} className="border-b border-border">
                      <td className="px-4 py-2">
                        {r.code} — {r.name}
                      </td>
                      <td className="px-4 py-2 text-right">{formatNOK(r.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Saldobalanse</h2>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-2">Konto</th>
                  <th className="px-4 py-2 text-right">Debet</th>
                  <th className="px-4 py-2 text-right">Kredit</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.map((row) => (
                  <tr key={row.account.id} className="border-b border-border">
                    <td className="px-4 py-2">
                      {row.account.code} — {row.account.name}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row.debit > 0 ? formatNOK(row.debit) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {row.credit > 0 ? formatNOK(row.credit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <Suspense fallback={<SectionSkeleton />}>
        <GeneralLedgerPreview companyId={session.companyId} />
      </Suspense>
    </div>
  );
}
