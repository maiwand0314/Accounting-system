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

/**
 * Regnskapsmotor: alle bilag går gjennom JournalService.
 * Regel: sum(debet) = sum(kredit) for hvert bilag.
 */
export class JournalService {
  /**
   * Validerer at bilaget er i balanse før det lagres.
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

  static async nextEntryNumber(
    companyId: string,
    date: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const db = tx ?? prisma;
    const year = date.getFullYear();
    const seq = await db.journalSequence.upsert({
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
      tx,
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

  private static journalLineFilter(
    companyId: string,
    asOf?: Date,
    accountId?: string,
  ): Prisma.JournalLineWhereInput {
    return {
      ...(accountId ? { accountId } : {}),
      journalEntry: {
        companyId,
        isPosted: true,
        ...(asOf ? { date: { lte: asOf } } : {}),
      },
    };
  }

  /** Account balance = sum(debit) - sum(credit) */
  static async getAccountBalance(
    companyId: string,
    accountId: string,
    asOf?: Date,
  ): Promise<Decimal> {
    const agg = await prisma.journalLine.aggregate({
      where: JournalService.journalLineFilter(companyId, asOf, accountId),
      _sum: { debit: true, credit: true },
    });
    return new Decimal(agg._sum.debit ?? 0).minus(agg._sum.credit ?? 0);
  }

  /** All account balances in one query — used by reports and trial balance */
  static async getBalanceMap(
    companyId: string,
    asOf?: Date,
  ): Promise<Map<string, Decimal>> {
    const groups = await prisma.journalLine.groupBy({
      by: ["accountId"],
      where: JournalService.journalLineFilter(companyId, asOf),
      _sum: { debit: true, credit: true },
    });

    const map = new Map<string, Decimal>();
    for (const group of groups) {
      map.set(
        group.accountId,
        new Decimal(group._sum.debit ?? 0).minus(group._sum.credit ?? 0),
      );
    }
    return map;
  }

  static async getTrialBalance(companyId: string, asOf?: Date) {
    const [accounts, balanceMap] = await Promise.all([
      prisma.account.findMany({
        where: { companyId, isActive: true },
        orderBy: { code: "asc" },
      }),
      JournalService.getBalanceMap(companyId, asOf),
    ]);

    return accounts
      .map((account) => {
        const balance = balanceMap.get(account.id) ?? new Decimal(0);
        return {
          account,
          debit: balance.gt(0) ? balance.toNumber() : 0,
          credit: balance.lt(0) ? balance.abs().toNumber() : 0,
        };
      })
      .filter((row) => row.debit !== 0 || row.credit !== 0);
  }
}
