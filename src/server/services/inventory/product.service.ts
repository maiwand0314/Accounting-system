import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import type { Prisma, VatRate } from "@prisma/client";

const productListSelect = {
  id: true,
  sku: true,
  barcode: true,
  name: true,
  costPrice: true,
  sellingPrice: true,
  quantityOnHand: true,
  lowStockThreshold: true,
  vatRate: true,
  isService: true,
  isActive: true,
  category: { select: { id: true, name: true } },
} satisfies Prisma.ProductSelect;

export type ProductListItem = Prisma.ProductGetPayload<{
  select: typeof productListSelect;
}>;

export class ProductService {
  static async list(
    companyId: string,
    opts: { search?: string; page?: number; pageSize?: number } = {},
  ) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 25;
    const search = opts.search?.trim();

    const where: Prisma.ProductWhereInput = {
      companyId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { barcode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        select: productListSelect,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  static async getCategories(companyId: string) {
    return prisma.productCategory.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  static async create(
    companyId: string,
    data: {
      name: string;
      sku: string;
      barcode?: string;
      description?: string;
      categoryId?: string;
      costPrice: number;
      sellingPrice: number;
      quantityOnHand?: number;
      lowStockThreshold?: number | null;
      vatRate: VatRate;
      isService?: boolean;
    },
  ) {
    return prisma.product.create({
      data: {
        companyId,
        name: data.name,
        sku: data.sku,
        barcode: data.barcode || null,
        description: data.description,
        categoryId: data.categoryId || null,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        quantityOnHand: data.quantityOnHand ?? 0,
        lowStockThreshold: data.lowStockThreshold ?? null,
        vatRate: data.vatRate,
        isService: data.isService ?? false,
      },
      select: productListSelect,
    });
  }

  static async update(
    companyId: string,
    productId: string,
    data: Partial<{
      name: string;
      sku: string;
      barcode: string | null;
      description: string | null;
      categoryId: string | null;
      costPrice: number;
      sellingPrice: number;
      lowStockThreshold: number | null;
      vatRate: VatRate;
      isService: boolean;
    }>,
  ) {
    return prisma.product.update({
      where: { id: productId, companyId },
      data,
      select: productListSelect,
    });
  }

  static async softDelete(companyId: string, productId: string) {
    return prisma.product.update({
      where: { id: productId, companyId },
      data: { isActive: false },
    });
  }

  /** Fast aggregate for dashboard — no full table scan in app code */
  static async getInventoryMetrics(companyId: string) {
    const products = await prisma.product.findMany({
      where: { companyId, isActive: true, isService: false },
      select: {
        quantityOnHand: true,
        costPrice: true,
        lowStockThreshold: true,
      },
    });

    let value = new Decimal(0);
    let lowStockCount = 0;

    for (const p of products) {
      const qty = new Decimal(p.quantityOnHand.toString());
      const cost = new Decimal(p.costPrice.toString());
      value = value.plus(qty.times(cost));
      if (
        p.lowStockThreshold &&
        qty.lte(new Decimal(p.lowStockThreshold.toString()))
      ) {
        lowStockCount++;
      }
    }

    return { inventoryValue: value.toNumber(), lowStockCount, productCount: products.length };
  }
}
