"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/constants/roles";
import {
  categorySchema,
  productSchema,
  stockMovementSchema,
} from "@/lib/validations/product";
import { ProductService } from "@/server/services/inventory/product.service";
import { InventoryService } from "@/server/services/inventory/inventory.service";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

function revalidateInventory() {
  revalidatePath("/produkter");
  revalidatePath("/dashboard");
  revalidatePath("/bilag");
}

export async function createProductAction(
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();
    if (!hasPermission(session.role, PERMISSIONS.manageInventory)) {
      return { success: false, error: "Ingen tilgang" };
    }

    const parsed = productSchema.safeParse({
      name: formData.get("name"),
      sku: formData.get("sku"),
      barcode: formData.get("barcode") || undefined,
      description: formData.get("description") || undefined,
      categoryId: formData.get("categoryId") || undefined,
      costPrice: formData.get("costPrice"),
      sellingPrice: formData.get("sellingPrice"),
      quantityOnHand: formData.get("quantityOnHand") || 0,
      lowStockThreshold: formData.get("lowStockThreshold") || null,
      vatRate: formData.get("vatRate"),
      isService: formData.get("isService") === "on",
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
    }

    const product = await ProductService.create(session.companyId, parsed.data);
    revalidateInventory();
    return { success: true, data: { id: product.id } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Kunne ikke opprette produkt",
    };
  }
}

export async function createCategoryAction(name: string): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();
    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) {
      return { success: false, error: "Ugyldig kategorinavn" };
    }

    const { prisma } = await import("@/lib/prisma");
    const cat = await prisma.productCategory.create({
      data: { companyId: session.companyId, name: parsed.data.name },
    });
    revalidatePath("/produkter");
    return { success: true, data: { id: cat.id } };
  } catch {
    return { success: false, error: "Kategorien finnes kanskje allerede" };
  }
}

export async function recordStockMovementAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  try {
    const session = await requireSession();
    if (!hasPermission(session.role, PERMISSIONS.manageInventory)) {
      return { success: false, error: "Ingen tilgang" };
    }

    const parsed = stockMovementSchema.safeParse({
      productId: formData.get("productId"),
      type: formData.get("type"),
      quantity: formData.get("quantity"),
      unitCost: formData.get("unitCost") || undefined,
      notes: formData.get("notes") || undefined,
      reference: formData.get("reference") || undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
    }

    const direction = formData.get("direction") as string | null;

    if (parsed.data.type === "ADJUSTMENT" && direction === "down") {
      await InventoryService.recordAdjustmentDown({
        companyId: session.companyId,
        userId: session.id,
        productId: parsed.data.productId,
        quantity: parsed.data.quantity,
        notes: parsed.data.notes,
      });
    } else {
      await InventoryService.recordMovement({
        companyId: session.companyId,
        userId: session.id,
        productId: parsed.data.productId,
        type: parsed.data.type,
        quantity: parsed.data.quantity,
        unitCost: parsed.data.unitCost,
        notes: parsed.data.notes,
        reference: parsed.data.reference,
      });
    }

    revalidateInventory();
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Kunne ikke registrere bevegelse",
    };
  }
}
