"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AuditService } from "@/server/services/audit/audit.service";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(8, "Passord må være minst 8 tegn"),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().min(2, "Navn må være minst 2 tegn"),
});

export type AuthActionState = {
  error?: string;
  success?: string;
};

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "E-posten er ikke bekreftet. Sjekk innboksen (og søppelpost) for bekreftelseslenke, eller slå av «Confirm email» i Supabase under Authentication → Providers → Email.",
      };
    }
    return { error: "Feil e-post eller passord" };
  }

  await syncUserFromAuth();
  redirect("/dashboard");
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ugyldig input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await provisionUser(data.user.id, parsed.data.email, parsed.data.fullName);
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });
    if (dbUser) {
      await AuditService.log({
        companyId: dbUser.companyId,
        userId: dbUser.id,
        action: "LOGIN",
        metadata: { event: "logout" },
      });
    }
  }

  await supabase.auth.signOut();
  redirect("/logg-inn");
}

async function syncUserFromAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;

  const existing = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });
  if (existing) {
    await AuditService.log({
      companyId: existing.companyId,
      userId: existing.id,
      action: "LOGIN",
      metadata: { event: "login" },
    });
    return;
  }

  const fullName =
    (user.user_metadata?.full_name as string) ?? user.email.split("@")[0];
  await provisionUser(user.id, user.email, fullName);
}

async function provisionUser(
  supabaseId: string,
  email: string,
  fullName: string,
) {
  const company = await prisma.company.findFirst();
  if (!company) {
    throw new Error("Ingen bedrift funnet. Kjør: npm run db:seed");
  }

  const userCount = await prisma.user.count({ where: { companyId: company.id } });
  const role = userCount === 0 ? "OWNER" : "EMPLOYEE";

  const user = await prisma.user.create({
    data: {
      supabaseId,
      email,
      fullName,
      role,
      companyId: company.id,
    },
  });

  await AuditService.log({
    companyId: company.id,
    userId: user.id,
    action: "LOGIN",
    metadata: { event: "register", role },
  });
}
