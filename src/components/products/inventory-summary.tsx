import { formatNOK } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductService } from "@/server/services/inventory/product.service";
import { unstable_cache } from "next/cache";
import { companyTag, CACHE_TAGS } from "@/lib/cache";

async function getSummary(companyId: string) {
  return unstable_cache(
    () => ProductService.getInventoryMetrics(companyId),
    [companyTag(companyId, "inventory-summary")],
    { revalidate: 30, tags: [companyTag(companyId, CACHE_TAGS.products)] },
  )();
}

export async function InventorySummary({ companyId }: { companyId: string }) {
  const metrics = await getSummary(companyId);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Lagerverdi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatNOK(metrics.inventoryValue)}</p>
          <p className="text-xs text-muted-foreground">Vektet gjennomsnittskost</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Produkter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{metrics.productCount}</p>
          <p className="text-xs text-muted-foreground">Aktive lagervarer</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Lavt lager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{metrics.lowStockCount}</p>
          <p className="text-xs text-muted-foreground">Under minstenivå</p>
        </CardContent>
      </Card>
    </div>
  );
}
