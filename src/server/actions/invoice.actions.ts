"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { PERMISSIONS, hasPermission } from "@/lib/constants/roles";
import { createInvoiceSchema, customerSchema } from "@/lib/validations/invoice";
import { CustomerService } from "@/server/services/invoice/customer.service";
import { InvoiceService } from "@/server/services/invoice/invoice.service";
import { PdfService } from "@/server/services/invoice/pdf.service";
import { EmailService } from "@/server/services/invoice/email.service";
import { formatDateNO, formatNOK } from "@/lib/utils";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

function revalidateInvoices(invoiceId?: string) {
  revalidatePath("/fakturaer");
  revalidatePath("/dashboard");
  revalidatePath("/bilag");
  revalidatePath("/produkter");
  if (invoiceId) revalidatePath(`/fakturaer/${invoiceId}`);
}

function revalidateInvoicePayment(invoiceId: string) {
  revalidatePath("/fakturaer");
  revalidatePath(`/fakturaer/${invoiceId}`);
  revalidatePath("/dashboard");
  revalidatePath("/bilag");
}

export async function createCustomerAction(
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireSession();
    const parsed = customerSchema.safeParse({
      type: formData.get("type"),
      name: formData.get("name"),
      orgNumber: formData.get("orgNumber") || undefined,
      vatNumber: formData.get("vatNumber") || undefined,
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
      address: formData.get("address") || undefined,
      city: formData.get("city") || undefined,
      postalCode: formData.get("postalCode") || undefined,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
    }

    const session = await requireSession();
    const customer = await CustomerService.create(session.companyId, {
      ...parsed.data,
      email: parsed.data.email || undefined,
    });
    revalidatePath("/fakturaer");
    return { success: true, data: { id: customer.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Feil ved opprettelse" };
  }
}

export async function createInvoiceAction(
  _prev: ActionResult<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireSession();
    if (!hasPermission(session.role, PERMISSIONS.createInvoice)) {
      return { success: false, error: "Ingen tilgang" };
    }

    const linesJson = formData.get("lines");
    if (typeof linesJson !== "string") {
      return { success: false, error: "Mangler fakturalinjer" };
    }

    const parsed = createInvoiceSchema.safeParse({
      customerId: formData.get("customerId"),
      issueDate: formData.get("issueDate"),
      dueDate: formData.get("dueDate"),
      notes: formData.get("notes") || undefined,
      lines: JSON.parse(linesJson),
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Ugyldig data" };
    }

    const invoice = await InvoiceService.createDraft({
      companyId: session.companyId,
      customerId: parsed.data.customerId,
      issueDate: new Date(parsed.data.issueDate),
      dueDate: new Date(parsed.data.dueDate),
      notes: parsed.data.notes,
      lines: parsed.data.lines,
    });

    revalidateInvoices();
    return { success: true, data: { id: invoice.id } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Kunne ikke opprette faktura" };
  }
}

export async function sendInvoiceAction(invoiceId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (!hasPermission(session.role, PERMISSIONS.createInvoice)) {
      return { success: false, error: "Ingen tilgang" };
    }

    await InvoiceService.sendInvoice({
      companyId: session.companyId,
      userId: session.id,
      invoiceId,
    });
    revalidateInvoices(invoiceId);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Kunne ikke sende faktura" };
  }
}

export async function markInvoicePaidAction(invoiceId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    if (!hasPermission(session.role, PERMISSIONS.markInvoicePaid)) {
      return { success: false, error: "Ingen tilgang" };
    }

    await InvoiceService.markAsPaid({
      companyId: session.companyId,
      userId: session.id,
      invoiceId,
    });
    revalidateInvoicePayment(invoiceId);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Kunne ikke registrere betaling" };
  }
}

export async function emailInvoiceAction(invoiceId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const invoice = await InvoiceService.getById(session.companyId, invoiceId);
    if (!invoice) return { success: false, error: "Faktura ikke funnet" };
    if (!invoice.customer.email) {
      return { success: false, error: "Kunden har ingen e-postadresse" };
    }
    if (invoice.status === "DRAFT") {
      return { success: false, error: "Send fakturaen før e-post" };
    }

    const pdf = await PdfService.generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      issueDate: formatDateNO(invoice.issueDate),
      dueDate: formatDateNO(invoice.dueDate),
      company: invoice.company,
      customer: invoice.customer,
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        vatRate: l.vatRate,
        lineTotal: Number(l.lineTotal),
        vatAmount: Number(l.vatAmount),
      })),
      subtotal: Number(invoice.subtotal),
      vatAmount: Number(invoice.vatAmount),
      total: Number(invoice.total),
      notes: invoice.notes,
    });

    await EmailService.sendInvoiceEmail({
      to: invoice.customer.email,
      customerName: invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      total: formatNOK(Number(invoice.total)),
      pdfBuffer: pdf,
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Kunne ikke sende e-post" };
  }
}
