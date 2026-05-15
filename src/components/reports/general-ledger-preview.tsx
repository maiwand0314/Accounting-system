import { ReportsService } from "@/server/services/reports/reports.service";
import { prisma } from "@/lib/prisma";
import { formatNOK } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function GeneralLedgerPreview({ companyId }: { companyId: string }) {
  const accounts = await prisma.account.findMany({
    where: { companyId, isActive: true },
    orderBy: { code: "asc" },
    take: 8,
    select: { id: true, code: true, name: true },
  });

  const ledgers = await Promise.all(
    accounts.map(async (account) => ({
      account,
      lines: await ReportsService.getGeneralLedger(companyId, account.id, 5),
    })),
  );

  const withLines = ledgers.filter((l) => l.lines.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hovedbok (utdrag)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {withLines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen posteringer ennå</p>
        ) : (
          withLines.map(({ account, lines }) => (
            <div key={account.id}>
              <p className="text-sm font-medium">
                {account.code} — {account.name}
              </p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {lines.map((l) => (
                  <li key={l.id} className="flex justify-between gap-4">
                    <span className="truncate">
                      {l.journalEntry.entryNumber} — {l.journalEntry.description}
                    </span>
                    <span className="shrink-0">
                      {Number(l.debit) > 0
                        ? `D ${formatNOK(Number(l.debit))}`
                        : `K ${formatNOK(Number(l.credit))}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
