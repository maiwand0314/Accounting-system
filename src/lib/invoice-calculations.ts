import Decimal from "decimal.js";
import { VAT_RATES } from "@/lib/constants/vat";
import type { VatRate } from "@prisma/client";

export type LineInput = {
  quantity: number;
  unitPrice: number;
  vatRate: VatRate;
};

export type CalculatedLine = LineInput & {
  lineTotal: number;
  vatAmount: number;
  grossTotal: number;
};

export function calculateLine(line: LineInput): CalculatedLine {
  const exVat = new Decimal(line.quantity).times(line.unitPrice);
  const rate = VAT_RATES[line.vatRate].rate;
  const vat = exVat.times(rate);
  return {
    ...line,
    lineTotal: exVat.toDecimalPlaces(2).toNumber(),
    vatAmount: vat.toDecimalPlaces(2).toNumber(),
    grossTotal: exVat.plus(vat).toDecimalPlaces(2).toNumber(),
  };
}

export function calculateInvoiceTotals(lines: CalculatedLine[]) {
  let subtotal = new Decimal(0);
  let vatAmount = new Decimal(0);
  for (const l of lines) {
    subtotal = subtotal.plus(l.lineTotal);
    vatAmount = vatAmount.plus(l.vatAmount);
  }
  const total = subtotal.plus(vatAmount);
  return {
    subtotal: subtotal.toDecimalPlaces(2).toNumber(),
    vatAmount: vatAmount.toDecimalPlaces(2).toNumber(),
    total: total.toDecimalPlaces(2).toNumber(),
  };
}
