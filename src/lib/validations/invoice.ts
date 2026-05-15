import { z } from "zod";
import { vatRateSchema } from "./product";

export const customerSchema = z.object({
  type: z.enum(["BUSINESS", "PRIVATE"]),
  name: z.string().min(1, "Navn er påkrevd"),
  orgNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  email: z.string().email("Ugyldig e-post").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
});

export const invoiceLineSchema = z.object({
  lineType: z.enum(["PRODUCT", "SERVICE"]),
  productId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  vatRate: vatRateSchema,
});

export const createInvoiceSchema = z.object({
  customerId: z.string().min(1),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  notes: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1, "Minst én fakturalinje"),
});
