/**
 * Prisma-klient (PostgreSQL via Supabase).
 * All forretningsdata lagres i databasen — ikke i nettleseren eller på Vercel.
 * Ved deploy huskes alt mellom økter så lenge DATABASE_URL peker på samme Supabase-prosjekt.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
