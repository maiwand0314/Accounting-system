"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useExpenses } from "@/lib/hooks/use-expenses";
import { formatDateNO, formatNOK } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VAT_RATES } from "@/lib/constants/vat";
import type { VatRate } from "@prisma/client";

const ExpenseFormDialog = dynamic(
  () => import("./expense-form-dialog").then((m) => m.ExpenseFormDialog),
  { ssr: false },
);

export function ExpenseList({
  accounts,
  vendors,
}: {
  accounts: { id: string; code: string; name: string }[];
  vendors: { id: string; name: string }[];
}) {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const year = new Date().getFullYear();
  const { data, isLoading, isFetching } = useExpenses(page, year);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Ny utgift
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Dato</th>
              <th className="px-4 py-3 font-medium">Beskrivelse</th>
              <th className="px-4 py-3 font-medium">Konto</th>
              <th className="px-4 py-3 font-medium">MVA</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : undefined}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-4">
                    <div className="h-4 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))
            ) : data?.items?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  Ingen utgifter registrert
                </td>
              </tr>
            ) : (
              data?.items?.map(
                (e: {
                  id: string;
                  description: string;
                  expenseDate: string;
                  total: string;
                  vatRate: VatRate;
                  account: { code: string; name: string };
                  vendor: { name: string } | null;
                  receipt: { fileName: string; ocrStatus: string } | null;
                }) => (
                  <tr key={e.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">{formatDateNO(e.expenseDate)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{e.description}</p>
                      {e.vendor && (
                        <p className="text-xs text-muted-foreground">{e.vendor.name}</p>
                      )}
                      {e.receipt && (
                        <Badge variant="outline" className="mt-1">
                          📎 {e.receipt.fileName}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {e.account.code} {e.account.name}
                    </td>
                    <td className="px-4 py-3">{VAT_RATES[e.vatRate].label}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatNOK(Number(e.total))}
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Forrige
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            loading={isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            Neste
          </Button>
        </div>
      )}

      {showForm && (
        <ExpenseFormDialog
          open={showForm}
          onClose={() => setShowForm(false)}
          accounts={accounts}
          vendors={vendors}
        />
      )}
    </div>
  );
}
