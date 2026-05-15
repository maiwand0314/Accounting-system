import type { VatRate } from "@prisma/client";

export const VAT_RATES: Record<
  VatRate,
  { label: string; rate: number; description: string }
> = {
  STANDARD_25: {
    label: "25 % MVA",
    rate: 0.25,
    description: "Ordinær sats",
  },
  REDUCED_15: {
    label: "15 % MVA",
    rate: 0.15,
    description: "Mat på serveringssted m.m.",
  },
  REDUCED_12: {
    label: "12 % MVA",
    rate: 0.12,
    description: "Transport, overnatting, kino m.m.",
  },
  ZERO: {
    label: "0 % MVA",
    rate: 0,
    description: "Fritatt / utenfor MVA",
  },
};

export function calculateVat(amountExVat: number, vatRate: VatRate): number {
  return Math.round(amountExVat * VAT_RATES[vatRate].rate * 100) / 100;
}

export function calculateGross(amountExVat: number, vatRate: VatRate): number {
  return amountExVat + calculateVat(amountExVat, vatRate);
}
