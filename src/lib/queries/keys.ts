import type { InvoiceStatus } from "@prisma/client";

export type CustomerOption = {
  id: string;
  name: string;
  type: string;
  email: string | null;
};

export type InvoiceProductOption = {
  id: string;
  name: string;
  sku: string;
  sellingPrice: string;
  vatRate: string;
  isService: boolean;
};

export const invoiceKeys = {
  all: ["invoices"] as const,
  list: (page: number, status?: InvoiceStatus | "") =>
    ["invoices", page, status ?? ""] as const,
};

export const customerKeys = {
  all: ["customers"] as const,
  list: (search?: string) => ["customers", search ?? ""] as const,
};

export const productKeys = {
  invoice: ["products-invoice"] as const,
};

export async function fetchInvoices(page: number, status?: InvoiceStatus | "") {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  const res = await fetch(`/api/invoices?${params}`);
  if (!res.ok) throw new Error("Kunne ikke hente fakturaer");
  return res.json();
}

export async function fetchCustomers(search?: string): Promise<CustomerOption[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await fetch(`/api/customers${params}`);
  if (!res.ok) throw new Error("Kunne ikke hente kunder");
  return res.json();
}

export async function fetchProductsForInvoice(): Promise<InvoiceProductOption[]> {
  const res = await fetch("/api/products?pageSize=100");
  if (!res.ok) throw new Error("Kunne ikke hente produkter");
  const data = await res.json();
  return data.items;
}
