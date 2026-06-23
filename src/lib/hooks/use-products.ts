"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";

export function useProducts(search: string, page: number) {
  return useQuery({
    queryKey: ["products", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error("Kunne ikke hente produkter");
      return res.json() as Promise<{
        items: Array<{
          id: string;
          sku: string;
          barcode: string | null;
          name: string;
          costPrice: string;
          sellingPrice: string;
          quantityOnHand: string;
          lowStockThreshold: string | null;
          isService: boolean;
          category: { id: string; name: string } | null;
        }>;
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>;
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useMovements(page: number, productId?: string) {
  return useQuery({
    queryKey: ["movements", page, productId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (productId) params.set("productId", productId);
      const res = await fetch(`/api/movements?${params}`);
      if (!res.ok) throw new Error("Kunne ikke hente bevegelser");
      return res.json();
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
