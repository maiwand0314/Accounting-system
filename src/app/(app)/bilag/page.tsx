import { requireRole } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/roles";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateNO, formatNOK } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  INVOICE: "Faktura",
  INVOICE_PAYMENT: "Betaling",
  EXPENSE: "Utgift",
  STOCK_MOVEMENT: "Lager",
  MANUAL: "Manuelt",
  OPENING_BALANCE: "Inngående saldo",
};

export default async function BilagPage() {
  const session = await requireRole(PERMISSIONS.postJournal);

  const entries = await prisma.journalEntry.findMany({
    where: { companyId: session.companyId },
    orderBy: { date: "desc" },
    include: {
      lines: { include: { account: true } },
      createdBy: { select: { fullName: true } },
    },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bilag</h1>
        <p className="text-muted-foreground">
          Dobbel bokføring — alle posteringer må balansere (debet = kredit)
        </p>
      </div>
      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Ingen bilag ennå. Bilag genereres automatisk fra forretningshendelser.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const total = entry.lines.reduce((s, l) => s + Number(l.debit), 0);
            return (
              <Card key={entry.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{entry.entryNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {entry.description} · {formatDateNO(entry.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatNOK(total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {SOURCE_LABELS[entry.sourceType] ?? entry.sourceType} ·{" "}
                      {entry.createdBy.fullName}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="pb-2 text-left">Konto</th>
                        <th className="pb-2 text-right">Debet</th>
                        <th className="pb-2 text-right">Kredit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="py-1">
                            {line.account.code} — {line.account.name}
                          </td>
                          <td className="py-1 text-right">
                            {Number(line.debit) > 0
                              ? formatNOK(Number(line.debit))
                              : "—"}
                          </td>
                          <td className="py-1 text-right">
                            {Number(line.credit) > 0
                              ? formatNOK(Number(line.credit))
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
