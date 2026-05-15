"use client";

import { useActionState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createExpenseAction,
  createVendorAction,
  type ActionResult,
} from "@/server/actions/expense.actions";
import { VAT_RATES } from "@/lib/constants/vat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ExpenseFormDialog({
  open,
  onClose,
  accounts,
  vendors,
}: {
  open: boolean;
  onClose: () => void;
  accounts: { id: string; code: string; name: string }[];
  vendors: { id: string; name: string }[];
}) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [expenseState, expenseAction, expensePending] = useActionState(
    createExpenseAction,
    { success: false, error: "" } satisfies ActionResult<{ id: string }>,
  );

  const [vendorState, vendorAction, vendorPending] = useActionState(
    createVendorAction,
    { success: false, error: "" } satisfies ActionResult<{ id: string }>,
  );

  useEffect(() => {
    if (expenseState.success) {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      onClose();
    }
  }, [expenseState.success, queryClient, onClose]);

  useEffect(() => {
    if (vendorState.success) {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    }
  }, [vendorState.success, queryClient]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Ny utgift</h2>
        <p className="text-sm text-muted-foreground">
          Bokføres automatisk: Dr kostnad + inngående MVA, Cr leverandørgjeld
        </p>

        <form action={expenseAction} className="mt-4 space-y-4" encType="multipart/form-data">
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Input id="description" name="description" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="accountId">Kostnadskonto</Label>
              <select
                id="accountId"
                name="accountId"
                required
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Velg konto</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorId">Leverandør</Label>
              <select
                id="vendorId"
                name="vendorId"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">Ingen</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Beløp eks. MVA</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatRate">MVA</Label>
              <select
                id="vatRate"
                name="vatRate"
                defaultValue="STANDARD_25"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {Object.entries(VAT_RATES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseDate">Dato</Label>
              <Input id="expenseDate" name="expenseDate" type="date" defaultValue={today} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="receipt">Kvittering (valgfri)</Label>
            <Input id="receipt" name="receipt" type="file" accept="image/*,.pdf" />
            <p className="text-xs text-muted-foreground">
              OCR-analyse kommer i Fase 5 — fil lagres i Supabase Storage
            </p>
          </div>
          {!expenseState.success && expenseState.error && (
            <p className="text-sm text-destructive">{expenseState.error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={expensePending}>
              {expensePending ? "Registrerer..." : "Registrer utgift"}
            </Button>
          </div>
        </form>

        <details className="mt-6 rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">Ny leverandør</summary>
          <form action={vendorAction} className="mt-3 space-y-2">
            <Input name="name" placeholder="Leverandørnavn" required />
            <Input name="orgNumber" placeholder="Org.nr" />
            {!vendorState.success && vendorState.error && (
              <p className="text-xs text-destructive">{vendorState.error}</p>
            )}
            <Button type="submit" size="sm" disabled={vendorPending}>
              Lagre leverandør
            </Button>
          </form>
        </details>
      </div>
    </div>
  );
}
