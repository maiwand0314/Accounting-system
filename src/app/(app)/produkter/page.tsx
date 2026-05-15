import { Suspense } from "react";
import { requireSession } from "@/lib/auth/session";
import { ProductService } from "@/server/services/inventory/product.service";
import { ProductsTabs } from "@/components/products/products-tabs";
import { InventorySummary } from "@/components/products/inventory-summary";

function SummarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export default async function ProdukterPage() {
  const session = await requireSession();
  const categories = await ProductService.getCategories(session.companyId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Produkter & lager</h1>
        <p className="text-muted-foreground">
          Produktkatalog, beholdning og lagerbevegelser med automatisk bokføring
        </p>
      </div>

      <Suspense fallback={<SummarySkeleton />}>
        <InventorySummary companyId={session.companyId} />
      </Suspense>

      <ProductsTabs categories={categories} />
    </div>
  );
}
