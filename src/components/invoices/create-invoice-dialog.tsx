"use client";

import { useState, useActionState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import {
  createInvoiceAction,
  createCustomerAction,
  type ActionResult,
} from "@/server/actions/invoice.actions";
import { useCustomers, useProductsForInvoice } from "@/lib/hooks/use-invoices";
import { calculateLine } from "@/lib/invoice-calculations";
import { VAT_RATES } from "@/lib/constants/vat";
import { formatNOK } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VatRate } from "@prisma/client";

type LineDraft = {
  lineType: "PRODUCT" | "SERVICE";
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: VatRate;
};

const emptyLine = (): LineDraft => ({
  lineType: "PRODUCT",
  description: "",
  quantity: 1,
  unitPrice: 0,
  vatRate: "STANDARD_25",
});

export function CreateInvoiceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: customers } = useCustomers();
  const { data: products } = useProductsForInvoice();
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);

  const [invoiceState, invoiceAction, invoicePending] = useActionState(
    createInvoiceAction,
    { success: false, error: "" } satisfies ActionResult<{ id: string }>,
  );

  const [customerState, customerAction, customerPending] = useActionState(
    createCustomerAction,
    { success: false, error: "" } satisfies ActionResult<{ id: string }>,
  );

  useEffect(() => {
    if (invoiceState.success) {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      onClose();
    }
  }, [invoiceState.success, queryClient, onClose]);

  useEffect(() => {
    if (customerState.success) {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setShowNewCustomer(false);
    }
  }, [customerState.success, queryClient]);

  if (!open) return null;

  const calculated = lines.map(calculateLine);
  const subtotal = calculated.reduce((s, l) => s + l.lineTotal, 0);
  const vat = calculated.reduce((s, l) => s + l.vatAmount, 0);
  const total = subtotal + vat;

  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  function addProductLine(productId: string) {
    const p = products?.find((x) => x.id === productId);
    if (!p) return;
    setLines((prev) => [
      ...prev,
      {
        lineType: p.isService ? "SERVICE" : "PRODUCT",
        productId: p.id,
        description: p.name,
        quantity: 1,
        unitPrice: Number(p.sellingPrice),
        vatRate: p.vatRate as VatRate,
      },
    ]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Ny faktura</h2>

        {showNewCustomer ? (
          <form action={customerAction} className="mt-4 space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Ny kunde</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Type</Label>
                <select name="type" className="flex h-10 w-full rounded-lg border border-input px-3 text-sm">
                  <option value="BUSINESS">Bedrift</option>
                  <option value="PRIVATE">Privat</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label>Navn</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-1">
                <Label>Org.nr</Label>
                <Input name="orgNumber" />
              </div>
              <div className="space-y-1">
                <Label>E-post</Label>
                <Input name="email" type="email" />
              </div>
            </div>
            {!customerState.success && customerState.error && (
              <p className="text-sm text-destructive">{customerState.error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={customerPending}>
                Lagre kunde
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowNewCustomer(false)}>
                Avbryt
              </Button>
            </div>
          </form>
        ) : null}

        <form action={invoiceAction} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Kunde</Label>
              <div className="flex gap-2">
                <select
                  name="customerId"
                  required
                  className="flex h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">Velg kunde</option>
                  {customers?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewCustomer(true)}>
                  Ny
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Legg til produkt</Label>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                onChange={(e) => {
                  if (e.target.value) addProductLine(e.target.value);
                  e.target.value = "";
                }}
                defaultValue=""
              >
                <option value="">Velg fra katalog...</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueDate">Fakturadato</Label>
              <Input id="issueDate" name="issueDate" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Forfallsdato</Label>
              <Input id="dueDate" name="dueDate" type="date" defaultValue={due} required />
            </div>
          </div>

          <input type="hidden" name="lines" value={JSON.stringify(lines)} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Linjer</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines((p) => [...p, emptyLine()])}>
                <Plus className="h-3 w-3" /> Linje
              </Button>
            </div>
            {lines.map((line, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-6">
                <select
                  value={line.lineType}
                  onChange={(e) =>
                    setLines((prev) => {
                      const n = [...prev];
                      n[i] = { ...n[i], lineType: e.target.value as "PRODUCT" | "SERVICE" };
                      return n;
                    })
                  }
                  className="h-9 rounded border border-input px-2 text-sm sm:col-span-1"
                >
                  <option value="PRODUCT">Vare</option>
                  <option value="SERVICE">Tjeneste</option>
                </select>
                <Input
                  placeholder="Beskrivelse"
                  value={line.description}
                  onChange={(e) =>
                    setLines((prev) => {
                      const n = [...prev];
                      n[i] = { ...n[i], description: e.target.value };
                      return n;
                    })
                  }
                  className="sm:col-span-2"
                />
                <Input
                  type="number"
                  placeholder="Ant."
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((prev) => {
                      const n = [...prev];
                      n[i] = { ...n[i], quantity: Number(e.target.value) };
                      return n;
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Pris"
                  value={line.unitPrice}
                  onChange={(e) =>
                    setLines((prev) => {
                      const n = [...prev];
                      n[i] = { ...n[i], unitPrice: Number(e.target.value) };
                      return n;
                    })
                  }
                />
                <select
                  value={line.vatRate}
                  onChange={(e) =>
                    setLines((prev) => {
                      const n = [...prev];
                      n[i] = { ...n[i], vatRate: e.target.value as VatRate };
                      return n;
                    })
                  }
                  className="h-9 rounded border border-input px-2 text-sm"
                >
                  {Object.entries(VAT_RATES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                  disabled={lines.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="text-right text-sm">
            <p>Sum eks. MVA: {formatNOK(subtotal)}</p>
            <p>MVA: {formatNOK(vat)}</p>
            <p className="text-lg font-bold">Totalt: {formatNOK(total)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notat</Label>
            <Input id="notes" name="notes" />
          </div>

          {!invoiceState.success && invoiceState.error && (
            <p className="text-sm text-destructive">{invoiceState.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={invoicePending}>
              {invoicePending ? "Lagrer..." : "Lagre utkast"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
