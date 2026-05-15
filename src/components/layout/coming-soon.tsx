import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-lg font-medium">Kommer i {phase}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Denne modulen er planlagt og vil bli implementert snart.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
