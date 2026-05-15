import { prisma } from "@/lib/prisma";
import { ACCOUNT_CODES } from "@/lib/constants/accounts";
import { JournalService } from "./journal.service";
import type { JournalSourceType } from "@prisma/client";

/**
 * High-level accounting operations.
 * Maps business events → double-entry journal lines using Norwegian chart of accounts.
 */
export class AccountingService {
  static async getAccountByCode(companyId: string, code: string) {
    const account = await prisma.account.findUnique({
      where: { companyId_code: { companyId, code } },
    });
    if (!account) {
      throw new Error(`Konto ${code} finnes ikke i kontoplanen`);
    }
    return account;
  }

  /**
   * Example: Manual opening balance or adjustment (Phase 1 foundation).
   * Invoice/expense/inventory flows will call JournalService in later phases.
   */
  static async postManualEntry(params: {
    companyId: string;
    createdById: string;
    date: Date;
    description: string;
    lines: { accountCode: string; debit?: number; credit?: number }[];
    sourceId?: string;
    sourceType?: JournalSourceType;
  }) {
    const resolvedLines = await Promise.all(
      params.lines.map(async (line) => {
        const account = await AccountingService.getAccountByCode(
          params.companyId,
          line.accountCode,
        );
        return {
          accountId: account.id,
          debit: line.debit,
          credit: line.credit,
        };
      }),
    );

    return JournalService.createEntry({
      companyId: params.companyId,
      createdById: params.createdById,
      date: params.date,
      description: params.description,
      sourceType: params.sourceType ?? "MANUAL",
      sourceId: params.sourceId,
      lines: resolvedLines,
    });
  }

  /**
   * Future Phase 3 — when invoice is marked PAID:
   *   Dr 1920 Bank          (total)
   *   Cr 1500 Kundefordringer (total)
   * Revenue + VAT were posted when invoice was SENT.
   */
  static async getSystemAccounts(companyId: string) {
    const codes = Object.values(ACCOUNT_CODES);
    return prisma.account.findMany({
      where: { companyId, code: { in: codes } },
    });
  }
}
