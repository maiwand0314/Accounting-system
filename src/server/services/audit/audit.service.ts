import { prisma } from "@/lib/prisma";
import type { AuditAction, Prisma } from "@prisma/client";

type AuditParams = {
  companyId: string;
  userId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

export class AuditService {
  static async log(params: AuditParams) {
    return prisma.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ?? undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }
}
