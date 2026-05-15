"use client";

import { useActionState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createProductAction,
  type ActionResult,
} from "@/server/actions/product.actions";
import { VAT_RATES } from "@/lib/constants/vat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProductFormDialog({
  categories,
  open,
  onClose,
}: {
  categories: { id: string; name: string }[];
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [state, action, pending] = useActionState(
    createProductAction,
    { success: false, error: "" } satisfies ActionResult<{ id: string }>,
  );

  useEffect(() => {
    if (state.success) {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    }
  }, [state.success, queryClient, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold">Nytt produkt</h2>
        <form action={action} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Navn</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode">Strekkode</Label>
              <Input id="barcode" name="barcode" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Kategori</Label>
              <select
                id="categoryId"
                name="categoryId"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Ingen</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatRate">MVA</Label>
              <select
                id="vatRate"
                name="vatRate"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                defaultValue="STANDARD_25"
              >
                {Object.entries(VAT_RATES).map(([key, v]) => (
                  <option key={key} value={key}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="costPrice">Kostpris (NOK)</Label>
              <Input id="costPrice" name="costPrice" type="number" step="0.01" min="0" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Salgspris (NOK)</Label>
              <Input id="sellingPrice" name="sellingPrice" type="number" step="0.01" min="0" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantityOnHand">Startbeholdning</Label>
              <Input id="quantityOnHand" name="quantityOnHand" type="number" step="1" min="0" defaultValue="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lowStockThreshold">Minstenivå</Label>
              <Input id="lowStockThreshold" name="lowStockThreshold" type="number" step="1" min="0" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isService" className="rounded" />
            Dette er en tjeneste (ikke lagerført)
          </label>
          {!state.success && state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Lagrer..." : "Opprett"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
