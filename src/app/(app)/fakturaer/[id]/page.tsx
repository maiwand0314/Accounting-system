import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { InvoiceService } from "@/server/services/invoice/invoice.service";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceDetailActions } from "@/components/invoices/invoice-detail-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateNO, formatNOK } from "@/lib/utils";
import { VAT_RATES } from "@/lib/constants/vat";
import { ArrowLeft } from "lucide-react";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const invoice = await InvoiceService.getById(session.companyId, id);
  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/fakturaer"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Tilbake
          </Link>
          <h1 className="text-2xl font-bold font-mono">{invoice.invoiceNumber}</h1>
          <p className="text-muted-foreground">{invoice.customer.name}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <InvoiceStatusBadge status={invoice.status} />
          <InvoiceDetailActions invoiceId={invoice.id} status={invoice.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fakturalinjer</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3">Beskrivelse</th>
                  <th className="px-4 py-3 text-right">Ant.</th>
                  <th className="px-4 py-3 text-right">Pris</th>
                  <th className="px-4 py-3 text-right">MVA</th>
                  <th className="px-4 py-3 text-right">Sum</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.id} className="border-b border-border">
                    <td className="px-4 py-3">{line.description}</td>
                    <td className="px-4 py-3 text-right">{Number(line.quantity)}</td>
                    <td className="px-4 py-3 text-right">
                      {formatNOK(Number(line.unitPrice))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {VAT_RATES[line.vatRate].label}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNOK(Number(line.lineTotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-border p-4 text-right text-sm space-y-1">
              <p>Sum eks. MVA: {formatNOK(Number(invoice.subtotal))}</p>
              <p>MVA: {formatNOK(Number(invoice.vatAmount))}</p>
              <p className="text-lg font-bold">Totalt: {formatNOK(Number(invoice.total))}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detaljer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Fakturadato:</span>{" "}
              {formatDateNO(invoice.issueDate)}
            </p>
            <p>
              <span className="text-muted-foreground">Forfall:</span>{" "}
              {formatDateNO(invoice.dueDate)}
            </p>
            {invoice.paidAt && (
              <p>
                <span className="text-muted-foreground">Betalt:</span>{" "}
                {formatDateNO(invoice.paidAt)}
              </p>
            )}
            {invoice.customer.orgNumber && (
              <p>
                <span className="text-muted-foreground">Org.nr:</span>{" "}
                {invoice.customer.orgNumber}
              </p>
            )}
            {invoice.customer.email && (
              <p>
                <span className="text-muted-foreground">E-post:</span>{" "}
                {invoice.customer.email}
              </p>
            )}
            {invoice.notes && (
              <p className="pt-2 border-t border-border">{invoice.notes}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {invoice.status !== "DRAFT" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bokføring ved sending</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>Dr 1500 Kundefordringer → Cr inntekt + Cr 2740 Utgående MVA</p>
            <p>Varelinjer: automatisk lagerreduksjon + COGS (Dr 4000 / Cr 1400)</p>
            <p>Ved betaling: Dr 1920 Bank → Cr 1500 Kundefordringer</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
