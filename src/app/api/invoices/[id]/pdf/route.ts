import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { InvoiceService } from "@/server/services/invoice/invoice.service";
import { PdfService } from "@/server/services/invoice/pdf.service";
import { formatDateNO } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const invoice = await InvoiceService.getById(session.companyId, id);
  if (!invoice) return new NextResponse("Not found", { status: 404 });
  if (invoice.status === "DRAFT") {
    return new NextResponse("Faktura er ikke sendt", { status: 400 });
  }

  const pdf = await PdfService.generateInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: formatDateNO(invoice.issueDate),
    dueDate: formatDateNO(invoice.dueDate),
    company: invoice.company,
    customer: invoice.customer,
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      vatRate: l.vatRate,
      lineTotal: Number(l.lineTotal),
      vatAmount: Number(l.vatAmount),
    })),
    subtotal: Number(invoice.subtotal),
    vatAmount: Number(invoice.vatAmount),
    total: Number(invoice.total),
    notes: invoice.notes,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
