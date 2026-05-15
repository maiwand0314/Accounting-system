import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_CODES } from "@/lib/constants/accounts";
import { AccountingService } from "@/server/services/accounting/accounting.service";
import { AuditService } from "@/server/services/audit/audit.service";
import type { StockMovementType } from "@prisma/client";

const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  PURCHASE: "Innkjøp",
  SALE: "Salg",
  RETURN_IN: "Retur inn",
  RETURN_OUT: "Retur ut",
  ADJUSTMENT: "Justering",
};

export class InventoryService {
  /**
   * Weighted average cost (MVP). Updates product.costPrice on purchase.
   * FIFO-ready: each purchase also creates an InventoryLayer.
   */
  static computeWeightedAverage(
    currentQty: Decimal,
    currentCost: Decimal,
    incomingQty: Decimal,
    incomingCost: Decimal,
  ): Decimal {
    const totalQty = currentQty.plus(incomingQty);
    if (totalQty.isZero()) return incomingCost;
    const totalValue = currentQty.times(currentCost).plus(incomingQty.times(incomingCost));
    return totalValue.div(totalQty);
  }

  static async recordMovement(params: {
    companyId: string;
    userId: string;
    productId: string;
    type: StockMovementType;
    quantity: number;
    unitCost?: number;
    notes?: string;
    reference?: string;
  }) {
    const qty = new Decimal(params.quantity);
    if (qty.lte(0)) throw new Error("Antall må være positivt");

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: params.productId, companyId: params.companyId, isActive: true },
      });
      if (!product) throw new Error("Produkt ikke funnet");
      if (product.isService) throw new Error("Tjenester har ikke lagerbeholdning");

      const currentQty = new Decimal(product.quantityOnHand.toString());
      const currentCost = new Decimal(product.costPrice.toString());
      const unitCost = new Decimal(params.unitCost ?? product.costPrice.toString());
      const totalCost = qty.times(unitCost);

      let newQty: Decimal;
      let newCost = currentCost;
      let journalLines: { accountCode: string; debit?: number; credit?: number }[] = [];

      switch (params.type) {
        case "PURCHASE":
        case "RETURN_IN":
          newQty = currentQty.plus(qty);
          newCost = InventoryService.computeWeightedAverage(
            currentQty,
            currentCost,
            qty,
            unitCost,
          );
          journalLines = [
            { accountCode: ACCOUNT_CODES.INVENTORY, debit: totalCost.toNumber() },
            { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, credit: totalCost.toNumber() },
          ];
          break;

        case "SALE":
        case "RETURN_OUT":
          if (currentQty.lt(qty)) throw new Error("Ikke nok på lager");
          newQty = currentQty.minus(qty);
          journalLines = [
            { accountCode: ACCOUNT_CODES.COGS, debit: totalCost.toNumber() },
            { accountCode: ACCOUNT_CODES.INVENTORY, credit: totalCost.toNumber() },
          ];
          break;

        case "ADJUSTMENT": {
          const signedQty = qty;
          if (signedQty.gt(0)) {
            newQty = currentQty.plus(signedQty);
            newCost = InventoryService.computeWeightedAverage(
              currentQty,
              currentCost,
              signedQty,
              unitCost,
            );
            journalLines = [
              { accountCode: ACCOUNT_CODES.INVENTORY, debit: totalCost.toNumber() },
              { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, credit: totalCost.toNumber() },
            ];
          } else {
            throw new Error("Bruk positivt antall; retning håndteres av type");
          }
          break;
        }

        default:
          throw new Error("Ugyldig bevegelsestype");
      }

      const movement = await tx.stockMovement.create({
        data: {
          companyId: params.companyId,
          productId: params.productId,
          type: params.type,
          quantity: qty.toNumber(),
          unitCost: unitCost.toNumber(),
          totalCost: totalCost.toNumber(),
          notes: params.notes,
          reference: params.reference,
        },
      });

      if (params.type === "PURCHASE" || params.type === "RETURN_IN") {
        await tx.inventoryLayer.create({
          data: {
            companyId: params.companyId,
            productId: params.productId,
            quantity: qty.toNumber(),
            unitCost: unitCost.toNumber(),
            remainingQty: qty.toNumber(),
            stockMovementId: movement.id,
          },
        });
      }

      await tx.product.update({
        where: { id: product.id },
        data: {
          quantityOnHand: newQty.toNumber(),
          costPrice: newCost.toNumber(),
        },
      });

      const journal = await AccountingService.postManualEntry(
        {
          companyId: params.companyId,
          createdById: params.userId,
          date: new Date(),
          description: `${MOVEMENT_LABELS[params.type]}: ${product.name} (${qty.toString()} stk)`,
          sourceType: "STOCK_MOVEMENT",
          sourceId: movement.id,
          lines: journalLines,
        },
        tx,
      );

      await tx.stockMovement.update({
        where: { id: movement.id },
        data: { journalEntryId: journal.id },
      });

      await AuditService.log({
        companyId: params.companyId,
        userId: params.userId,
        action: "INVENTORY_ADJUSTED",
        entityType: "StockMovement",
        entityId: movement.id,
        metadata: { type: params.type, productId: product.id, quantity: params.quantity },
      });

      return movement;
    });
  }

  /** Decrease stock for adjustments (negative correction) */
  static async recordAdjustmentDown(params: {
    companyId: string;
    userId: string;
    productId: string;
    quantity: number;
    notes?: string;
  }) {
    const qty = new Decimal(params.quantity);
    if (qty.lte(0)) throw new Error("Antall må være positivt");

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: params.productId, companyId: params.companyId, isActive: true },
      });
      if (!product || product.isService) throw new Error("Ugyldig produkt");

      const currentQty = new Decimal(product.quantityOnHand.toString());
      const unitCost = new Decimal(product.costPrice.toString());
      if (currentQty.lt(qty)) throw new Error("Ikke nok på lager");

      const totalCost = qty.times(unitCost);
      const newQty = currentQty.minus(qty);

      const movement = await tx.stockMovement.create({
        data: {
          companyId: params.companyId,
          productId: params.productId,
          type: "ADJUSTMENT",
          quantity: qty.negated().toNumber(),
          unitCost: unitCost.toNumber(),
          totalCost: totalCost.toNumber(),
          notes: params.notes ?? "Lagerjustering (reduksjon)",
        },
      });

      await tx.product.update({
        where: { id: product.id },
        data: { quantityOnHand: newQty.toNumber() },
      });

      const journal = await AccountingService.postManualEntry(
        {
          companyId: params.companyId,
          createdById: params.userId,
          date: new Date(),
          description: `Lagerjustering ned: ${product.name}`,
          sourceType: "STOCK_MOVEMENT",
          sourceId: movement.id,
          lines: [
            { accountCode: ACCOUNT_CODES.COGS, debit: totalCost.toNumber() },
            { accountCode: ACCOUNT_CODES.INVENTORY, credit: totalCost.toNumber() },
          ],
        },
        tx,
      );

      await tx.stockMovement.update({
        where: { id: movement.id },
        data: { journalEntryId: journal.id },
      });

      return movement;
    });
  }

  static async listMovements(
    companyId: string,
    opts: { productId?: string; page?: number; pageSize?: number } = {},
  ) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;

    const where = {
      companyId,
      ...(opts.productId ? { productId: opts.productId } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.stockMovement.findMany({
        where,
        orderBy: { movementDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          quantity: true,
          unitCost: true,
          totalCost: true,
          notes: true,
          reference: true,
          movementDate: true,
          product: { select: { id: true, name: true, sku: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
