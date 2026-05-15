import { prisma } from "@/lib/prisma";

export class VendorService {
  static async list(companyId: string) {
    return prisma.vendor.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        orgNumber: true,
        email: true,
      },
    });
  }

  static async create(
    companyId: string,
    data: {
      name: string;
      orgNumber?: string;
      vatNumber?: string;
      email?: string;
    },
  ) {
    return prisma.vendor.create({
      data: {
        companyId,
        name: data.name,
        orgNumber: data.orgNumber || null,
        vatNumber: data.vatNumber || null,
        email: data.email || null,
      },
    });
  }
}
