import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { JournalService } from "@/server/services/accounting/journal.service";
import { ACCOUNT_CODES } from "@/lib/constants/accounts";
import { formatNOK } from "@/lib/utils";

export type DashboardStats = {
  revenue: number;
  expenses: number;
  profit: number;
  outstandingInvoices: number;
  outstandingCount: number;
  inventoryValue: number;
  lowStockCount: number;
  recentJournalEntries: {
    id: string;
    entryNumber: string;
    description: string;
    date: Date;
    total: number;
  }[];
};

export class DashboardService {
  static async getStats(companyId: string): Promise<DashboardStats> {
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        code: {
          in: [
            ACCOUNT_CODES.SALES_GOODS,
            ACCOUNT_CODES.SALES_SERVICES,
            ACCOUNT_CODES.COGS,
            ACCOUNT_CODES.INVENTORY,
          ],
        },
      },
    });

    const byCode = Object.fromEntries(accounts.map((a) => [a.code, a]));

    const revenueGoods = byCode[ACCOUNT_CODES.SALES_GOODS]
      ? await JournalService.getAccountBalance(companyId, byCode[ACCOUNT_CODES.SALES_GOODS].id)
      : new Decimal(0);
    const revenueServices = byCode[ACCOUNT_CODES.SALES_SERVICES]
      ? await JournalService.getAccountBalance(companyId, byCode[ACCOUNT_CODES.SALES_SERVICES].id)
      : new Decimal(0);
    const cogs = byCode[ACCOUNT_CODES.COGS]
      ? await JournalService.getAccountBalance(companyId, byCode[ACCOUNT_CODES.COGS].id)
      : new Decimal(0);

    const revenue = revenueGoods.abs().plus(revenueServices.abs());
    const expenses = cogs.abs();
    const profit = revenue.minus(expenses);

    const outstanding = await prisma.invoice.aggregate({
      where: {
        companyId,
        status: { in: ["SENT", "OVERDUE"] },
      },
      _sum: { total: true },
      _count: true,
    });

    const products = await prisma.product.findMany({
      where: { companyId, isActive: true, isService: false },
    });

    let inventoryValue = new Decimal(0);
    let lowStockCount = 0;
    for (const p of products) {
      inventoryValue = inventoryValue.plus(
        new Decimal(p.quantityOnHand.toString()).times(p.costPrice.toString()),
      );
      if (
        p.lowStockThreshold &&
        new Decimal(p.quantityOnHand.toString()).lte(p.lowStockThreshold.toString())
      ) {
        lowStockCount++;
      }
    }

    const recentJournalEntries = await prisma.journalEntry.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { lines: true },
    });

    return {
      revenue: revenue.toNumber(),
      expenses: expenses.toNumber(),
      profit: profit.toNumber(),
      outstandingInvoices: Number(outstanding._sum.total ?? 0),
      outstandingCount: outstanding._count,
      inventoryValue: inventoryValue.toNumber(),
      lowStockCount,
      recentJournalEntries: recentJournalEntries.map((e) => ({
        id: e.id,
        entryNumber: e.entryNumber,
        description: e.description,
        date: e.date,
        total: e.lines.reduce(
          (sum, l) => sum + Number(l.debit),
          0,
        ),
      })),
    };
  }

  static formatStats(stats: DashboardStats) {
    return {
      ...stats,
      revenueFormatted: formatNOK(stats.revenue),
      expensesFormatted: formatNOK(stats.expenses),
      profitFormatted: formatNOK(stats.profit),
      outstandingFormatted: formatNOK(stats.outstandingInvoices),
      inventoryFormatted: formatNOK(stats.inventoryValue),
    };
  }
}
