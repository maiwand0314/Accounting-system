"use client";

import { useState } from "react";
import { useMovements } from "@/lib/hooks/use-products";
import { formatDateNO, formatNOK } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Innkjøp",
  SALE: "Salg",
  RETURN_IN: "Retur inn",
  RETURN_OUT: "Retur ut",
  ADJUSTMENT: "Justering",
};

export function MovementsTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMovements(page);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Dato</th>
              <th className="px-4 py-3 font-medium">Produkt</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Antall</th>
              <th className="px-4 py-3 text-right font-medium">Verdi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))
            ) : data?.items?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Ingen lagerbevegelser ennå
                </td>
              </tr>
            ) : (
              data?.items?.map((m: {
                id: string;
                type: string;
                quantity: string;
                totalCost: string;
                movementDate: string;
                product: { name: string; sku: string };
              }) => (
                <tr key={m.id} className="border-b border-border">
                  <td className="px-4 py-3">{formatDateNO(m.movementDate)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.product.name}</p>
                    <p className="text-xs text-muted-foreground">{m.product.sku}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{TYPE_LABELS[m.type] ?? m.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{Number(m.quantity)}</td>
                  <td className="px-4 py-3 text-right">
                    {formatNOK(Math.abs(Number(m.totalCost)))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data && data.total > data.pageSize && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Forrige
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page * data.pageSize >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Neste
          </Button>
        </div>
      )}
    </div>
  );
}
