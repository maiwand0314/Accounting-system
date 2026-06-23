"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";

export function useExpenses(page: number, year?: number) {
  return useQuery({
    queryKey: ["expenses", page, year],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (year) params.set("year", String(year));
      const res = await fetch(`/api/expenses?${params}`);
      if (!res.ok) throw new Error("Kunne ikke hente utgifter");
      return res.json();
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
