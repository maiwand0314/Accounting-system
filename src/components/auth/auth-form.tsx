"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthActionState } from "@/server/actions/auth.actions";

type AuthFormProps = {
  mode: "login" | "register";
  action: (
    prev: AuthActionState,
    formData: FormData,
  ) => Promise<AuthActionState>;
};

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === "login" ? "Logg inn" : "Opprett konto"}</CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Logg inn for å administrere regnskapet"
            : "Registrer deg for å komme i gang"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Fullt navn</Label>
              <Input id="fullName" name="fullName" required autoComplete="name" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-post</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passord</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? "Vennligst vent..."
              : mode === "login"
                ? "Logg inn"
                : "Registrer"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Har du ikke konto?{" "}
              <Link href="/registrer" className="text-primary hover:underline">
                Registrer deg
              </Link>
            </>
          ) : (
            <>
              Har du allerede konto?{" "}
              <Link href="/logg-inn" className="text-primary hover:underline">
                Logg inn
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
