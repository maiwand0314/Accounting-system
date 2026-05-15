import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User, Company } from "@prisma/client";

export type SessionUser = User & { company: Company };

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { company: true },
  });

  return dbUser;
});

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/logg-inn");
  return session;
}

export async function requireRole(
  allowed: SessionUser["role"][],
): Promise<SessionUser> {
  const session = await requireSession();
  if (!allowed.includes(session.role)) redirect("/dashboard");
  return session;
}
