/**
 * Beskytter app-ruter: uinnlogget bruker sendes til /logg-inn.
 * Sesjon lagres via Supabase Auth (cookies) — fungerer likt lokalt og på Vercel.
 */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
