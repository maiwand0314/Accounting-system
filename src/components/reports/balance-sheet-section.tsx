import { ReportsService } from "@/server/services/reports/reports.service";
import { formatNOK } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function BalanceSheetSection({ companyId }: { companyId: string }) {
  const bs = await ReportsService.getBalanceSheet(companyId, new Date());

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Balanse</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        {(["ASSET", "LIABILITY", "EQUITY"] as const).map((type) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {type === "ASSET" ? "Eiendeler" : type === "LIABILITY" ? "Gjeld" : "Egenkapital"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {bs.sections[type].map((r) => (
                <div key={r.code} className="flex justify-between">
                  <span className="truncate">{r.code}</span>
                  <span>{formatNOK(r.balance)}</span>
                </div>
              ))}
              <p className="border-t border-border pt-2 font-medium flex justify-between">
                <span>Sum</span>
                <span>
                  {formatNOK(
                    bs.sections[type].reduce((s, r) => s + r.balance, 0),
                  )}
                </span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
