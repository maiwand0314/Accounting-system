"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { InvoiceStatus } from "@prisma/client";

export function useInvoices(page: number, status?: InvoiceStatus | "") {
  return useQuery({
    queryKey: ["invoices", page, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set("status", status);
      const res = await fetch(`/api/invoices?${params}`);
      if (!res.ok) throw new Error("Kunne ikke hente fakturaer");
      return res.json();
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ["customers", search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/customers${params}`);
      if (!res.ok) throw new Error("Kunne ikke hente kunder");
      return res.json() as Promise<
        Array<{ id: string; name: string; type: string; email: string | null }>
      >;
    },
    staleTime: 60_000,
  });
}

export function useProductsForInvoice() {
  return useQuery({
    queryKey: ["products-invoice"],
    queryFn: async () => {
      const res = await fetch("/api/products?pageSize=100");
      if (!res.ok) throw new Error("Kunne ikke hente produkter");
      const data = await res.json();
      return data.items as Array<{
        id: string;
        name: string;
        sku: string;
        sellingPrice: string;
        vatRate: string;
        isService: boolean;
      }>;
    },
    staleTime: 60_000,
  });
}
