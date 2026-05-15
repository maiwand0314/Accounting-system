import { z } from "zod";
import { vatRateSchema } from "./product";

export const vendorSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  orgNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  email: z.string().email("Ugyldig e-post").optional().or(z.literal("")),
});

export const expenseSchema = z.object({
  description: z.string().min(1, "Beskrivelse er påkrevd"),
  accountId: z.string().min(1, "Velg kostnadskonto"),
  vendorId: z.string().optional(),
  amount: z.coerce.number().positive("Beløp må være positivt"),
  vatRate: vatRateSchema,
  expenseDate: z.string().min(1),
});
