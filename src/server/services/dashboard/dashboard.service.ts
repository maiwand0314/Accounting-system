import { unstable_cache } from "next/cache";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { companyTag, CACHE_TAGS } from "@/lib/cache";
import { JournalService } from "@/server/services/accounting/journal.service";
import { ProductService } from "@/server/services/inventory/product.service";
import { InvoiceService } from "@/server/services/invoice/invoice.service";
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
  productCount: number;
  recentJournalEntries: {
    id: string;
    entryNumber: string;
    description: string;
    date: Date;
    total: number;
  }[];
};

async function fetchDashboardStats(companyId: string): Promise<DashboardStats> {
  const [accounts, outstandingInvoices, inventory, recentJournalEntries] = await Promise.all([
    prisma.account.findMany({
      where: {
        companyId,
        code: {
          in: [
            ACCOUNT_CODES.SALES_GOODS,
            ACCOUNT_CODES.SALES_SERVICES,
            ACCOUNT_CODES.COGS,
          ],
        },
      },
      select: { id: true, code: true },
    }),
    InvoiceService.getOutstandingTotal(companyId),
    ProductService.getInventoryMetrics(companyId),
    prisma.journalEntry.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        entryNumber: true,
        description: true,
        date: true,
        lines: { select: { debit: true } },
      },
    }),
  ]);

  const byCode = Object.fromEntries(accounts.map((a) => [a.code, a.id]));
  const balanceMap = await JournalService.getBalanceMap(companyId);

  const revenueGoods = byCode[ACCOUNT_CODES.SALES_GOODS]
    ? balanceMap.get(byCode[ACCOUNT_CODES.SALES_GOODS]) ?? new Decimal(0)
    : new Decimal(0);
  const revenueServices = byCode[ACCOUNT_CODES.SALES_SERVICES]
    ? balanceMap.get(byCode[ACCOUNT_CODES.SALES_SERVICES]) ?? new Decimal(0)
    : new Decimal(0);
  const cogs = byCode[ACCOUNT_CODES.COGS]
    ? balanceMap.get(byCode[ACCOUNT_CODES.COGS]) ?? new Decimal(0)
    : new Decimal(0);

  const revenue = revenueGoods.abs().plus(revenueServices.abs());
  const expenses = cogs.abs();

  return {
    revenue: revenue.toNumber(),
    expenses: expenses.toNumber(),
    profit: revenue.minus(expenses).toNumber(),
    outstandingInvoices: outstandingInvoices.total,
    outstandingCount: outstandingInvoices.count,
    inventoryValue: inventory.inventoryValue,
    lowStockCount: inventory.lowStockCount,
    productCount: inventory.productCount,
    recentJournalEntries: recentJournalEntries.map((e) => ({
      id: e.id,
      entryNumber: e.entryNumber,
      description: e.description,
      date: e.date,
      total: e.lines.reduce((sum, l) => sum + Number(l.debit), 0),
    })),
  };
}

export class DashboardService {
  static getStats(companyId: string) {
    return unstable_cache(
      () => fetchDashboardStats(companyId),
      [companyTag(companyId, CACHE_TAGS.dashboard)],
      { revalidate: 30, tags: [companyTag(companyId, CACHE_TAGS.dashboard)] },
    )();
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
