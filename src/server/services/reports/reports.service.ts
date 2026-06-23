import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { JournalService } from "@/server/services/accounting/journal.service";
import { ProductService } from "@/server/services/inventory/product.service";
import { InvoiceService } from "@/server/services/invoice/invoice.service";
import { ExpenseService } from "@/server/services/expense/expense.service";
import { ACCOUNT_CODES } from "@/lib/constants/accounts";
import type { AccountType } from "@prisma/client";

export class ReportsService {
  static async getProfitAndLoss(companyId: string, year: number) {
    const asOf = new Date(year, 11, 31);
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        type: { in: ["REVENUE", "EXPENSE"] },
        isActive: true,
      },
      orderBy: { code: "asc" },
    });

    const balanceMap = await JournalService.getBalanceMap(companyId, asOf);
    const rows = accounts.map((account) => {
      const balance = balanceMap.get(account.id) ?? new Decimal(0);
      return { account, amount: balance.abs().toNumber() };
    });

    const revenue = rows
      .filter((r) => r.account.type === "REVENUE")
      .reduce((s, r) => s + r.amount, 0);
    const expenses = rows
      .filter((r) => r.account.type === "EXPENSE")
      .reduce((s, r) => s + r.amount, 0);

    return {
      year,
      rows: rows.filter((r) => r.amount !== 0),
      revenue,
      expenses,
      profit: revenue - expenses,
    };
  }

  static async getBalanceSheet(companyId: string, asOf: Date) {
    const types: AccountType[] = ["ASSET", "LIABILITY", "EQUITY"];
    const accounts = await prisma.account.findMany({
      where: { companyId, type: { in: types }, isActive: true },
      orderBy: { code: "asc" },
    });

    type Row = { code: string; name: string; balance: number };
    const sections: Record<"ASSET" | "LIABILITY" | "EQUITY", Row[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
    };
    const rows: Row[] = [];

    const balanceMap = await JournalService.getBalanceMap(companyId, asOf);

    for (const account of accounts) {
      const bal = balanceMap.get(account.id) ?? new Decimal(0);
      let balance = bal.toNumber();
      if (account.type === "LIABILITY" || account.type === "EQUITY") {
        balance = bal.negated().toNumber();
      }
      if (balance === 0) continue;
      if (account.type !== "ASSET" && account.type !== "LIABILITY" && account.type !== "EQUITY") {
        continue;
      }
      const row = { code: account.code, name: account.name, balance };
      rows.push(row);
      sections[account.type].push(row);
    }

    const totalAssets = sections.ASSET.reduce((s, r) => s + r.balance, 0);
    const totalLiabilities = sections.LIABILITY.reduce((s, r) => s + r.balance, 0);
    const totalEquity = sections.EQUITY.reduce((s, r) => s + r.balance, 0);

    return {
      asOf,
      sections,
      totalAssets,
      totalLiabilities,
      totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
    };
  }

  static async getTrialBalance(companyId: string, asOf?: Date) {
    return JournalService.getTrialBalance(companyId, asOf);
  }

  static async getGeneralLedger(
    companyId: string,
    accountId: string,
    limit = 100,
  ) {
    return prisma.journalLine.findMany({
      where: {
        accountId,
        journalEntry: { companyId, isPosted: true },
      },
      orderBy: { journalEntry: { date: "desc" } },
      take: limit,
      include: {
        journalEntry: {
          select: {
            entryNumber: true,
            date: true,
            description: true,
            sourceType: true,
          },
        },
      },
    });
  }

  static async getVatSummary(companyId: string, year: number) {
    const to = new Date(year, 11, 31);

    const [outputAccount, inputAccount, balanceMap] = await Promise.all([
      prisma.account.findUnique({
        where: { companyId_code: { companyId, code: ACCOUNT_CODES.OUTPUT_VAT } },
      }),
      prisma.account.findUnique({
        where: { companyId_code: { companyId, code: ACCOUNT_CODES.INPUT_VAT } },
      }),
      JournalService.getBalanceMap(companyId, to),
    ]);

    const outputVat = outputAccount
      ? (balanceMap.get(outputAccount.id) ?? new Decimal(0)).abs().toNumber()
      : 0;
    const inputVat = inputAccount
      ? (balanceMap.get(inputAccount.id) ?? new Decimal(0)).abs().toNumber()
      : 0;

    return {
      year,
      outputVat,
      inputVat,
      netPayable: outputVat - inputVat,
    };
  }

  static async getDashboardReports(companyId: string) {
    const year = new Date().getFullYear();
    const [pl, vat, inventory, outstanding, expenseSummary] = await Promise.all([
      ReportsService.getProfitAndLoss(companyId, year),
      ReportsService.getVatSummary(companyId, year),
      ProductService.getInventoryMetrics(companyId),
      InvoiceService.getOutstandingTotal(companyId),
      ExpenseService.getSummaryByAccount(companyId, year),
    ]);

    return { pl, vat, inventory, outstanding, expenseSummary, year };
  }
}
