import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_CODES } from "@/lib/constants/accounts";
import { calculateLine } from "@/lib/invoice-calculations";
import { AccountingService } from "@/server/services/accounting/accounting.service";
import { AuditService } from "@/server/services/audit/audit.service";
import type { Prisma, VatRate } from "@prisma/client";

type JsonValue = Prisma.InputJsonValue;

export class ExpenseService {
  static async list(
    companyId: string,
    opts: { page?: number; pageSize?: number; from?: Date; to?: Date } = {},
  ) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const where: Prisma.ExpenseWhereInput = {
      companyId,
      ...(opts.from || opts.to
        ? {
            expenseDate: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.expense.findMany({
        where,
        orderBy: { expenseDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          description: true,
          amount: true,
          vatAmount: true,
          total: true,
          expenseDate: true,
          vatRate: true,
          account: { select: { code: true, name: true } },
          vendor: { select: { name: true } },
          receipt: { select: { id: true, fileName: true, ocrStatus: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  static async create(params: {
    companyId: string;
    userId: string;
    description: string;
    accountId: string;
    vendorId?: string;
    amount: number;
    vatRate: VatRate;
    expenseDate: Date;
  }) {
    const calc = calculateLine({
      quantity: 1,
      unitPrice: params.amount,
      vatRate: params.vatRate,
    });

    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          companyId: params.companyId,
          createdById: params.userId,
          accountId: params.accountId,
          vendorId: params.vendorId || null,
          description: params.description,
          amount: calc.lineTotal,
          vatRate: params.vatRate,
          vatAmount: calc.vatAmount,
          total: calc.grossTotal,
          expenseDate: params.expenseDate,
        },
      });

      const journalLines: { accountCode: string; debit?: number; credit?: number }[] = [
        { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, credit: calc.grossTotal },
      ];

      const expenseAccount = await tx.account.findUnique({
        where: { id: params.accountId },
      });
      if (!expenseAccount) throw new Error("Kostnadskonto ikke funnet");

      journalLines.unshift({
        accountCode: expenseAccount.code,
        debit: calc.lineTotal,
      });

      if (calc.vatAmount > 0) {
        journalLines.splice(1, 0, {
          accountCode: ACCOUNT_CODES.INPUT_VAT,
          debit: calc.vatAmount,
        });
      }

      const journal = await AccountingService.postManualEntry(
        {
          companyId: params.companyId,
          createdById: params.userId,
          date: params.expenseDate,
          description: `Utgift: ${params.description}`,
          sourceType: "EXPENSE",
          sourceId: expense.id,
          lines: journalLines,
        },
        tx,
      );

      await tx.expense.update({
        where: { id: expense.id },
        data: { journalEntryId: journal.id },
      });

      await AuditService.log({
        companyId: params.companyId,
        userId: params.userId,
        action: "EXPENSE_CREATED",
        entityType: "Expense",
        entityId: expense.id,
      });

      return expense;
    });
  }

  static async attachReceipt(params: {
    companyId: string;
    expenseId: string;
    storagePath: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    ocrData?: JsonValue;
  }) {
    return prisma.receipt.create({
      data: {
        companyId: params.companyId,
        expenseId: params.expenseId,
        storagePath: params.storagePath,
        fileName: params.fileName,
        mimeType: params.mimeType,
        fileSize: params.fileSize,
        ocrStatus: "pending",
        ocrRaw: params.ocrData ?? undefined,
      },
    });
  }

  static async getExpenseAccounts(companyId: string) {
    return prisma.account.findMany({
      where: { companyId, type: "EXPENSE", isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    });
  }

  static async getSummaryByAccount(companyId: string, year: number) {
    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31);
    const expenses = await prisma.expense.findMany({
      where: { companyId, expenseDate: { gte: from, lte: to } },
      include: { account: true },
    });

    const map = new Map<string, { code: string; name: string; total: Decimal }>();
    for (const e of expenses) {
      const key = e.accountId;
      const cur = map.get(key) ?? {
        code: e.account.code,
        name: e.account.name,
        total: new Decimal(0),
      };
      cur.total = cur.total.plus(e.total.toString());
      map.set(key, cur);
    }

    return Array.from(map.values()).map((r) => ({
      code: r.code,
      name: r.name,
      total: r.total.toNumber(),
    }));
  }
}
