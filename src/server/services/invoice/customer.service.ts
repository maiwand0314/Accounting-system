import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const customerSelect = {
  id: true,
  type: true,
  name: true,
  orgNumber: true,
  vatNumber: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  postalCode: true,
} satisfies Prisma.CustomerSelect;

export class CustomerService {
  static async list(companyId: string, search?: string) {
    return prisma.customer.findMany({
      where: {
        companyId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { orgNumber: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: customerSelect,
      orderBy: { name: "asc" },
      take: 100,
    });
  }

  static async create(
    companyId: string,
    data: {
      type: "BUSINESS" | "PRIVATE";
      name: string;
      orgNumber?: string;
      vatNumber?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      postalCode?: string;
    },
  ) {
    return prisma.customer.create({
      data: { companyId, ...data, email: data.email || null },
      select: customerSelect,
    });
  }
}
