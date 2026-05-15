"use client";

import { useActionState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  recordStockMovementAction,
  type ActionResult,
} from "@/server/actions/product.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MOVEMENT_TYPES = [
  { value: "PURCHASE", label: "Innkjøp" },
  { value: "SALE", label: "Salg" },
  { value: "RETURN_IN", label: "Retur inn" },
  { value: "RETURN_OUT", label: "Retur ut" },
  { value: "ADJUSTMENT", label: "Justering" },
] as const;

export function StockMovementDialog({
  productId,
  open,
  onClose,
}: {
  productId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [state, action, pending] = useActionState(
    recordStockMovementAction,
    { success: false, error: "" } satisfies ActionResult,
  );

  useEffect(() => {
    if (state.success) {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      onClose();
    }
  }, [state.success, queryClient, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold">Lagerbevegelse</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Oppretter bilag automatisk i regnskapet
        </p>
        <form action={action} className="mt-4 space-y-4">
          <input type="hidden" name="productId" value={productId} />
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              name="type"
              required
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="direction">Retning (kun justering)</Label>
            <select
              id="direction"
              name="direction"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="up">Øk beholdning</option>
              <option value="down">Reduser beholdning</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Antall</Label>
              <Input id="quantity" name="quantity" type="number" step="1" min="0.0001" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitCost">Enhetskost (valgfri)</Label>
              <Input id="unitCost" name="unitCost" type="number" step="0.01" min="0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Referanse</Label>
            <Input id="reference" name="reference" placeholder="F.eks. PO-1234" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notat</Label>
            <Input id="notes" name="notes" />
          </div>
          {!state.success && state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Registrerer..." : "Registrer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
