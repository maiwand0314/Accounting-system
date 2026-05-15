import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_CODES } from "@/lib/constants/accounts";
import { calculateInvoiceTotals, calculateLine } from "@/lib/invoice-calculations";
import { AccountingService } from "@/server/services/accounting/accounting.service";
import { InventoryService } from "@/server/services/inventory/inventory.service";
import { AuditService } from "@/server/services/audit/audit.service";
import type { InvoiceStatus, LineItemType, Prisma, VatRate } from "@prisma/client";

export type InvoiceLineInput = {
  lineType: LineItemType;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: VatRate;
};

const invoiceListSelect = {
  id: true,
  invoiceNumber: true,
  status: true,
  issueDate: true,
  dueDate: true,
  subtotal: true,
  vatAmount: true,
  total: true,
  paidAmount: true,
  paidAt: true,
  customer: { select: { id: true, name: true, type: true } },
} satisfies Prisma.InvoiceSelect;

export class InvoiceService {
  static async nextInvoiceNumber(companyId: string, year: number, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    const seq = await db.invoiceSequence.upsert({
      where: { companyId_year: { companyId, year } },
      create: { companyId, year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    return `INV-${year}-${String(seq.lastNumber).padStart(4, "0")}`;
  }

  static async list(
    companyId: string,
    opts: { status?: InvoiceStatus; page?: number; pageSize?: number } = {},
  ) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(opts.status ? { status: opts.status } : {}),
    };

    await InvoiceService.markOverdue(companyId);

    const [items, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        select: invoiceListSelect,
        orderBy: { issueDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  static async markOverdue(companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.invoice.updateMany({
      where: {
        companyId,
        status: "SENT",
        dueDate: { lt: today },
      },
      data: { status: "OVERDUE" },
    });
  }

  static async getById(companyId: string, invoiceId: string) {
    return prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: {
        customer: true,
        company: true,
        lines: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });
  }

  static async createDraft(params: {
    companyId: string;
    customerId: string;
    issueDate: Date;
    dueDate: Date;
    notes?: string;
    lines: InvoiceLineInput[];
  }) {
    const calculated = params.lines.map(calculateLine);
    const totals = calculateInvoiceTotals(calculated);

    return prisma.invoice.create({
      data: {
        companyId: params.companyId,
        customerId: params.customerId,
        invoiceNumber: "UTKAST",
        status: "DRAFT",
        issueDate: params.issueDate,
        dueDate: params.dueDate,
        notes: params.notes,
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        total: totals.total,
        lines: {
          create: params.lines.map((line, i) => ({
            lineType: line.lineType,
            productId: line.productId || null,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            vatRate: line.vatRate,
            lineTotal: calculated[i].lineTotal,
            vatAmount: calculated[i].vatAmount,
          })),
        },
      },
      include: { customer: true, lines: true },
    });
  }

  /**
   * Sender faktura fra DRAFT → SENT:
   * 1. Tildeler INV-ÅÅÅÅ-NNNN
   * 2. Bilag: Dr kundefordring, Cr inntekt + utgående MVA
   * 3. Varelinjer: lagerbevegelse SALE (COGS) etter commit
   */
  static async sendInvoice(params: {
    companyId: string;
    userId: string;
    invoiceId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: params.invoiceId, companyId: params.companyId, status: "DRAFT" },
        include: { lines: true, customer: true },
      });
      if (!invoice) throw new Error("Faktura ikke funnet eller kan ikke sendes");

      const year = invoice.issueDate.getFullYear();
      const invoiceNumber = await InvoiceService.nextInvoiceNumber(
        params.companyId,
        year,
        tx,
      );

      let revenueGoods = new Decimal(0);
      let revenueServices = new Decimal(0);
      const vatTotal = new Decimal(invoice.vatAmount.toString());

      for (const line of invoice.lines) {
        const exVat = new Decimal(line.lineTotal.toString());
        if (line.lineType === "PRODUCT") {
          revenueGoods = revenueGoods.plus(exVat);
        } else {
          revenueServices = revenueServices.plus(exVat);
        }
      }

      const total = new Decimal(invoice.total.toString());
      const journalLines: { accountCode: string; debit?: number; credit?: number }[] = [
        { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, debit: total.toNumber() },
      ];
      if (revenueGoods.gt(0)) {
        journalLines.push({
          accountCode: ACCOUNT_CODES.SALES_GOODS,
          credit: revenueGoods.toNumber(),
        });
      }
      if (revenueServices.gt(0)) {
        journalLines.push({
          accountCode: ACCOUNT_CODES.SALES_SERVICES,
          credit: revenueServices.toNumber(),
        });
      }
      if (vatTotal.gt(0)) {
        journalLines.push({
          accountCode: ACCOUNT_CODES.OUTPUT_VAT,
          credit: vatTotal.toNumber(),
        });
      }

      const journal = await AccountingService.postManualEntry(
        {
          companyId: params.companyId,
          createdById: params.userId,
          date: invoice.issueDate,
          description: `Faktura ${invoiceNumber} — ${invoice.customer.name}`,
          sourceType: "INVOICE",
          sourceId: invoice.id,
          lines: journalLines,
        },
        tx,
      );

      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "SENT", invoiceNumber },
        include: { customer: true, lines: true },
      });

      await AuditService.log({
        companyId: params.companyId,
        userId: params.userId,
        action: "INVOICE_CREATED",
        entityType: "Invoice",
        entityId: invoice.id,
        metadata: { invoiceNumber, event: "sent", journalId: journal.id },
      });

      return { updated, productLines: invoice.lines };
    }).then(async ({ updated, productLines }) => {
      for (const line of productLines) {
        if (line.lineType === "PRODUCT" && line.productId) {
          await InventoryService.recordMovement({
            companyId: params.companyId,
            userId: params.userId,
            productId: line.productId,
            type: "SALE",
            quantity: Number(line.quantity),
            reference: updated.invoiceNumber,
            notes: `Faktura ${updated.invoiceNumber}`,
          });
        }
      }
      return updated;
    });
  }

  /** Mark invoice as paid — post bank vs receivable */
  static async markAsPaid(params: {
    companyId: string;
    userId: string;
    invoiceId: string;
    paidAmount?: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: {
          id: params.invoiceId,
          companyId: params.companyId,
          status: { in: ["SENT", "OVERDUE"] },
        },
        include: { customer: true },
      });
      if (!invoice) throw new Error("Faktura kan ikke markeres som betalt");

      const amount = new Decimal(
        params.paidAmount ?? invoice.total.toString(),
      );
      const total = new Decimal(invoice.total.toString());
      if (amount.gt(total)) throw new Error("Betalt beløp overstiger fakturatotal");

      await AccountingService.postManualEntry(
        {
          companyId: params.companyId,
          createdById: params.userId,
          date: new Date(),
          description: `Betaling faktura ${invoice.invoiceNumber}`,
          sourceType: "INVOICE_PAYMENT",
          sourceId: invoice.id,
          lines: [
            { accountCode: ACCOUNT_CODES.BANK, debit: amount.toNumber() },
            {
              accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
              credit: amount.toNumber(),
            },
          ],
        },
        tx,
      );

      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "PAID",
          paidAmount: amount.toNumber(),
          paidAt: new Date(),
        },
        include: { customer: true, lines: true },
      });

      await AuditService.log({
        companyId: params.companyId,
        userId: params.userId,
        action: "INVOICE_PAID",
        entityType: "Invoice",
        entityId: invoice.id,
        metadata: { amount: amount.toNumber() },
      });

      return updated;
    });
  }

  static async getOutstandingTotal(companyId: string) {
    const result = await prisma.invoice.aggregate({
      where: { companyId, status: { in: ["SENT", "OVERDUE"] } },
      _sum: { total: true },
      _count: true,
    });
    return {
      total: Number(result._sum.total ?? 0),
      count: result._count,
    };
  }
}
