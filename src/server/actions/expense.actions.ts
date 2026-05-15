"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/constants/roles";
import { expenseSchema, vendorSchema } from "@/lib/validations/expense";
import { ExpenseService } from "@/server/services/expense/expense.service";
import { VendorService } from "@/server/services/expense/vendor.service";
import { uploadReceipt } from "@/lib/supabase/storage";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function createVendorAction(
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();
    const parsed = vendorSchema.safeParse({
      name: formData.get("name"),
      orgNumber: formData.get("orgNumber") || undefined,
      vatNumber: formData.get("vatNumber") || undefined,
      email: formData.get("email") || undefined,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
    }
    const vendor = await VendorService.create(session.companyId, parsed.data);
    revalidatePath("/utgifter");
    return { success: true, data: { id: vendor.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Feil" };
  }
}

export async function createExpenseAction(
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();
    if (!hasPermission(session.role, PERMISSIONS.postJournal)) {
      return { success: false, error: "Ingen tilgang" };
    }

    const parsed = expenseSchema.safeParse({
      description: formData.get("description"),
      accountId: formData.get("accountId"),
      vendorId: formData.get("vendorId") || undefined,
      amount: formData.get("amount"),
      vatRate: formData.get("vatRate"),
      expenseDate: formData.get("expenseDate"),
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
    }

    const expense = await ExpenseService.create({
      companyId: session.companyId,
      userId: session.id,
      description: parsed.data.description,
      accountId: parsed.data.accountId,
      vendorId: parsed.data.vendorId,
      amount: parsed.data.amount,
      vatRate: parsed.data.vatRate,
      expenseDate: new Date(parsed.data.expenseDate),
    });

    const receipt = formData.get("receipt") as File | null;
    if (receipt && receipt.size > 0) {
      try {
        const buffer = Buffer.from(await receipt.arrayBuffer());
        const path = await uploadReceipt({
          companyId: session.companyId,
          expenseId: expense.id,
          file: buffer,
          fileName: receipt.name,
          mimeType: receipt.type || "application/octet-stream",
        });
        await ExpenseService.attachReceipt({
          companyId: session.companyId,
          expenseId: expense.id,
          storagePath: path,
          fileName: receipt.name,
          mimeType: receipt.type,
          fileSize: receipt.size,
          ocrData: { status: "pending", note: "OCR-integrasjon kommer i Fase 5" },
        });
      } catch {
        // Utgift er bokført — kvittering kan lastes opp senere
      }
    }

    revalidatePath("/utgifter");
    revalidatePath("/bilag");
    revalidatePath("/dashboard");
    revalidatePath("/rapporter");
    return { success: true, data: { id: expense.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Kunne ikke registrere utgift" };
  }
}
