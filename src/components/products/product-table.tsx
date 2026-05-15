"use client";

import { useDeferredValue, useState } from "react";
import { Plus, Package, AlertTriangle, Search } from "lucide-react";
import { useProducts } from "@/lib/hooks/use-products";
import { formatNOK } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";

const ProductFormDialog = dynamic(
  () => import("./product-form-dialog").then((m) => m.ProductFormDialog),
  { ssr: false },
);
const StockMovementDialog = dynamic(
  () => import("./stock-movement-dialog").then((m) => m.StockMovementDialog),
  { ssr: false },
);

export function ProductTable({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showProductForm, setShowProductForm] = useState(false);
  const [movementProductId, setMovementProductId] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search);
  const { data, isLoading, isFetching } = useProducts(deferredSearch, page);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Søk SKU, strekkode, navn..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button onClick={() => setShowProductForm(true)}>
          <Plus className="h-4 w-4" />
          Nytt produkt
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Produkt</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Kategori</th>
              <th className="px-4 py-3 text-right font-medium">På lager</th>
              <th className="px-4 py-3 text-right font-medium">Kost</th>
              <th className="px-4 py-3 text-right font-medium">Pris</th>
              <th className="px-4 py-3 text-right font-medium">Handling</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={7} className="px-4 py-4">
                    <div className="h-4 animate-pulse rounded bg-muted" />
                  </td>
                </tr>
              ))
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  Ingen produkter ennå
                </td>
              </tr>
            ) : (
              data?.items.map((p) => {
                const qty = Number(p.quantityOnHand);
                const threshold = p.lowStockThreshold
                  ? Number(p.lowStockThreshold)
                  : null;
                const isLow =
                  !p.isService && threshold !== null && qty <= threshold;

                return (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.name}</span>
                        {p.isService && (
                          <Badge variant="secondary">Tjeneste</Badge>
                        )}
                        {isLow && (
                          <Badge variant="warning">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Lavt
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {p.category?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.isService ? "—" : qty}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNOK(Number(p.costPrice))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNOK(Number(p.sellingPrice))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!p.isService && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMovementProductId(p.id)}
                        >
                          Bevegelse
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data.total} produkter {isFetching && "· oppdaterer..."}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Forrige
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Neste
            </Button>
          </div>
        </div>
      )}

      {showProductForm && (
        <ProductFormDialog
          categories={categories}
          open={showProductForm}
          onClose={() => setShowProductForm(false)}
        />
      )}
      {movementProductId && (
        <StockMovementDialog
          productId={movementProductId}
          open={!!movementProductId}
          onClose={() => setMovementProductId(null)}
        />
      )}
    </div>
  );
}
