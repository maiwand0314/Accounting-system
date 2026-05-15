import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted px-4">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
          R
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Regnskap</h1>
        <p className="mt-3 text-muted-foreground">
          Moderne regnskaps- og lagersystem for norske bedrifter. Fakturaer,
          lager, MVA og dobbel bokføring — alt på ett sted.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/logg-inn">Logg inn</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/registrer">Opprett konto</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
