import { requireRole } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/constants/roles";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Eiendel",
  LIABILITY: "Gjeld",
  EQUITY: "Egenkapital",
  REVENUE: "Inntekt",
  EXPENSE: "Kostnad",
};

export default async function KontoplanPage() {
  const session = await requireRole(PERMISSIONS.manageChartOfAccounts);

  const accounts = await prisma.account.findMany({
    where: { companyId: session.companyId, isActive: true },
    orderBy: { code: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kontoplan</h1>
        <p className="text-muted-foreground">
          Norsk standard kontoplan (NS 4102-inspirert) for {session.company.name}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{accounts.length} kontoer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium">Konto</th>
                  <th className="px-6 py-3 text-left font-medium">Navn</th>
                  <th className="px-6 py-3 text-left font-medium">Type</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} className="border-b border-border">
                    <td className="px-6 py-3 font-mono">{account.code}</td>
                    <td className="px-6 py-3">{account.name}</td>
                    <td className="px-6 py-3">
                      {TYPE_LABELS[account.type] ?? account.type}
                    </td>
                    <td className="px-6 py-3">
                      {account.isSystem ? (
                        <Badge variant="secondary">System</Badge>
                      ) : (
                        <Badge variant="outline">Egendefinert</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
