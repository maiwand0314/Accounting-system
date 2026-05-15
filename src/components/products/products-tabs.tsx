"use client";

import { useState } from "react";
import { ProductTable } from "./product-table";
import { MovementsTable } from "./movements-table";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "products", label: "Produkter" },
  { id: "movements", label: "Bevegelser" },
] as const;

export function ProductsTabs({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("products");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "products" ? (
        <ProductTable categories={categories} />
      ) : (
        <MovementsTable />
      )}
    </div>
  );
}
