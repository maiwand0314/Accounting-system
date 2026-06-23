"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { InvoiceStatus } from "@prisma/client";
import {
  customerKeys,
  fetchCustomers,
  fetchInvoices,
  fetchProductsForInvoice,
  invoiceKeys,
  productKeys,
} from "@/lib/queries/keys";

export function useInvoices(page: number, status?: InvoiceStatus | "") {
  return useQuery({
    queryKey: invoiceKeys.list(page, status),
    queryFn: () => fetchInvoices(page, status),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: customerKeys.list(search),
    queryFn: () => fetchCustomers(search),
    staleTime: 60_000,
  });
}

export function useProductsForInvoice() {
  return useQuery({
    queryKey: productKeys.invoice,
    queryFn: fetchProductsForInvoice,
    staleTime: 60_000,
  });
}
