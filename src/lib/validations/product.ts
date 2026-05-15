import { z } from "zod";

export const vatRateSchema = z.enum([
  "STANDARD_25",
  "REDUCED_15",
  "REDUCED_12",
  "ZERO",
]);

export const productSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  sku: z.string().min(1, "SKU er påkrevd"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  quantityOnHand: z.coerce.number().min(0).optional(),
  lowStockThreshold: z.coerce.number().min(0).optional().nullable(),
  vatRate: vatRateSchema,
  isService: z.coerce.boolean().optional(),
});

export const stockMovementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["PURCHASE", "SALE", "RETURN_IN", "RETURN_OUT", "ADJUSTMENT"]),
  quantity: z.coerce.number().positive("Antall må være positivt"),
  unitCost: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  reference: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Kategorinavn er påkrevd"),
});
