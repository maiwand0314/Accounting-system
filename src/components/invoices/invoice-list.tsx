"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useInvoices } from "@/lib/hooks/use-invoices";
import {
  customerKeys,
  fetchCustomers,
  fetchInvoices,
  fetchProductsForInvoice,
  invoiceKeys,
  productKeys,
} from "@/lib/queries/keys";
import { formatDateNO, formatNOK } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import type { InvoiceStatus } from "@prisma/client";
import dynamic from "next/dynamic";

const CreateInvoiceDialog = dynamic(
  () => import("./create-invoice-dialog").then((m) => m.CreateInvoiceDialog),
  { ssr: false },
);

const STATUS_FILTERS: { value: "" | InvoiceStatus; label: string }[] = [
  { value: "", label: "Alle" },
  { value: "DRAFT", label: "Utkast" },
  { value: "SENT", label: "Sendt" },
  { value: "OVERDUE", label: "Forfalt" },
  { value: "PAID", label: "Betalt" },
];

export function InvoiceList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | InvoiceStatus>("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isFetching } = useInvoices(page, status);

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: customerKeys.list(),
      queryFn: () => fetchCustomers(),
    });
    void queryClient.prefetchQuery({
      queryKey: productKeys.invoice,
      queryFn: fetchProductsForInvoice,
    });
  }, [queryClient]);

  function prefetchPage(nextPage: number) {
    void queryClient.prefetchQuery({
      queryKey: invoiceKeys.list(nextPage, status),
      queryFn: () => fetchInvoices(nextPage, status),
    });
  }

  function prefetchCreateData() {
    void queryClient.prefetchQuery({
      queryKey: customerKeys.list(),
      queryFn: () => fetchCustomers(),
    });
    void queryClient.prefetchQuery({
      queryKey: productKeys.invoice,
      queryFn: fetchProductsForInvoice,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={status === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button
          onMouseEnter={prefetchCreateData}
          onFocus={prefetchCreateData}
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4" />
          Ny faktura
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Nr.</th>
              <th className="px-4 py-3 font-medium">Kunde</th>
              <th className="px-4 py-3 font-medium">Dato</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Beløp</th>
            </tr>
          </thead>
          <tbody className={isFetching && !isLoading ? "opacity-60 transition-opacity" : undefined}>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-4">
                    <div className="h-4 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))
            ) : data?.items?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  Ingen fakturaer
                </td>
              </tr>
            ) : (
              data?.items?.map(
                (inv: {
                  id: string;
                  invoiceNumber: string;
                  status: InvoiceStatus;
                  issueDate: string;
                  total: string;
                  customer: { name: string };
                }) => (
                  <tr key={inv.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/fakturaer/${inv.id}`}
                        className="font-mono text-primary hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{inv.customer.name}</td>
                    <td className="px-4 py-3">{formatDateNO(inv.issueDate)}</td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatNOK(Number(inv.total))}
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
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onMouseEnter={() => prefetchPage(page - 1)}
            onClick={() => setPage((p) => p - 1)}
          >
            Forrige
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            loading={isFetching}
            onMouseEnter={() => prefetchPage(page + 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Neste
          </Button>
        </div>
      )}

      {showCreate && (
        <CreateInvoiceDialog open={showCreate} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
