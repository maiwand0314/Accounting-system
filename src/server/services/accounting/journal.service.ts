import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import type {
  JournalSourceType,
  Prisma,
  VatRate,
} from "@prisma/client";

export type JournalLineInput = {
  accountId: string;
  debit?: number | string;
  credit?: number | string;
  description?: string;
  vatRate?: VatRate;
};

export type CreateJournalEntryInput = {
  companyId: string;
  createdById: string;
  date: Date;
  description: string;
  sourceType: JournalSourceType;
  sourceId?: string;
  lines: JournalLineInput[];
};

export class JournalService {
  /**
   * Core double-entry rule: total debits must equal total credits.
   * Every business event (invoice, expense, payment, stock) posts through here.
   */
  static validateBalance(lines: JournalLineInput[]): void {
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const line of lines) {
      totalDebit = totalDebit.plus(line.debit ?? 0);
      totalCredit = totalCredit.plus(line.credit ?? 0);
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new Error(
        `Bilag er ikke i balanse: debet ${totalDebit.toFixed(2)} ≠ kredit ${totalCredit.toFixed(2)}`,
      );
    }

    if (totalDebit.isZero()) {
      throw new Error("Bilag må ha minst én postering med beløp");
    }
  }

  static async nextEntryNumber(companyId: string, date: Date): Promise<string> {
    const year = date.getFullYear();
    const seq = await prisma.journalSequence.upsert({
      where: { companyId_year: { companyId, year } },
      create: { companyId, year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    const num = String(seq.lastNumber).padStart(4, "0");
    return `BILAG-${year}-${num}`;
  }

  static async createEntry(
    input: CreateJournalEntryInput,
    tx?: Prisma.TransactionClient,
  ) {
    JournalService.validateBalance(input.lines);

    const db = tx ?? prisma;
    const entryNumber = await JournalService.nextEntryNumber(
      input.companyId,
      input.date,
    );

    return db.journalEntry.create({
      data: {
        companyId: input.companyId,
        entryNumber,
        date: input.date,
        description: input.description,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        createdById: input.createdById,
        lines: {
          create: input.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit ?? 0,
            credit: line.credit ?? 0,
            description: line.description,
            vatRate: line.vatRate,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });
  }

  /** Account balance = sum(debit) - sum(credit) for asset/expense; reversed for liability/equity/revenue */
  static async getAccountBalance(
    companyId: string,
    accountId: string,
    asOf?: Date,
  ): Promise<Decimal> {
    const where: Prisma.JournalLineWhereInput = {
      accountId,
      journalEntry: {
        companyId,
        isPosted: true,
        ...(asOf ? { date: { lte: asOf } } : {}),
      },
    };

    const lines = await prisma.journalLine.findMany({ where });
    let balance = new Decimal(0);
    for (const line of lines) {
      balance = balance.plus(line.debit).minus(line.credit);
    }
    return balance;
  }

  static async getTrialBalance(companyId: string, asOf?: Date) {
    const accounts = await prisma.account.findMany({
      where: { companyId, isActive: true },
      orderBy: { code: "asc" },
    });

    const rows = await Promise.all(
      accounts.map(async (account) => {
        const balance = await JournalService.getAccountBalance(
          companyId,
          account.id,
          asOf,
        );
        return {
          account,
          debit: balance.gt(0) ? balance.toNumber() : 0,
          credit: balance.lt(0) ? balance.abs().toNumber() : 0,
        };
      }),
    );

    return rows.filter((r) => r.debit !== 0 || r.credit !== 0);
  }
}
