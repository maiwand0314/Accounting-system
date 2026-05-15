import { Suspense } from "react";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";

export default function RapporterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rapporter</h1>
        <p className="text-muted-foreground">
          Resultat, balanse, MVA, saldobalanse og hovedbok
        </p>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        }
      >
        <ReportsDashboard />
      </Suspense>
    </div>
  );
}
