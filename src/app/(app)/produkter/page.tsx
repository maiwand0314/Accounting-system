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

function TabsSkeleton() {
  return <div className="h-96 animate-pulse rounded-xl bg-muted" />;
}

async function ProductsTabsLoader({ companyId }: { companyId: string }) {
  const categories = await ProductService.getCategories(companyId);
  return <ProductsTabs categories={categories} />;
}

export default async function ProdukterPage() {
  const session = await requireSession();

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

      <Suspense fallback={<TabsSkeleton />}>
        <ProductsTabsLoader companyId={session.companyId} />
      </Suspense>
    </div>
  );
}
