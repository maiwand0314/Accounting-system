import { requireSession } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InnstillingerPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Innstillinger</h1>
        <p className="text-muted-foreground">Bedriftsinformasjon og systeminnstillinger</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bedrift</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="font-medium">Navn:</span> {session.company.name}</p>
          <p><span className="font-medium">Org.nr:</span> {session.company.orgNumber}</p>
          <p><span className="font-medium">MVA-nr:</span> {session.company.vatNumber ?? "—"}</p>
          <p><span className="font-medium">Valuta:</span> {session.company.currency}</p>
          <p><span className="font-medium">Enhetstype:</span> {session.company.entityType}</p>
        </CardContent>
      </Card>
    </div>
  );
}
