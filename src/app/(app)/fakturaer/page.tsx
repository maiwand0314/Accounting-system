import { Suspense } from "react";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { requireSession } from "@/lib/auth/session";
import { InvoiceService } from "@/server/services/invoice/invoice.service";
import { invoiceKeys } from "@/lib/queries/keys";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNOK } from "@/lib/utils";

async function OutstandingSummary({ companyId }: { companyId: string }) {
  const { total, count } = await InvoiceService.getOutstandingTotal(companyId);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Utestående fakturaer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{formatNOK(total)}</p>
        <p className="text-xs text-muted-foreground">{count} åpne fakturaer</p>
      </CardContent>
    </Card>
  );
}

export default async function FakturaerPage() {
  const session = await requireSession();
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: invoiceKeys.list(1, ""),
    queryFn: () =>
      InvoiceService.list(session.companyId, { page: 1, pageSize: 20 }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Fakturaer</h1>
          <p className="text-muted-foreground">
            Opprett, send og følg opp fakturaer med automatisk MVA og bokføring
          </p>
        </div>

        <Suspense
          fallback={<div className="h-28 animate-pulse rounded-xl bg-muted" />}
        >
          <OutstandingSummary companyId={session.companyId} />
        </Suspense>

        <InvoiceList />
      </div>
    </HydrationBoundary>
  );
}
