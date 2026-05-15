import type { UserRole } from "@prisma/client";

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Eier",
  ACCOUNTANT: "Regnskapsfører",
  EMPLOYEE: "Ansatt",
};

/** Minimum role required for route/feature access */
export const PERMISSIONS = {
  manageUsers: ["OWNER"] as UserRole[],
  manageChartOfAccounts: ["OWNER", "ACCOUNTANT"] as UserRole[],
  postJournal: ["OWNER", "ACCOUNTANT"] as UserRole[],
  createInvoice: ["OWNER", "ACCOUNTANT", "EMPLOYEE"] as UserRole[],
  markInvoicePaid: ["OWNER", "ACCOUNTANT"] as UserRole[],
  manageInventory: ["OWNER", "ACCOUNTANT", "EMPLOYEE"] as UserRole[],
  viewReports: ["OWNER", "ACCOUNTANT"] as UserRole[],
  viewDashboard: ["OWNER", "ACCOUNTANT", "EMPLOYEE"] as UserRole[],
} as const;

export function hasPermission(
  userRole: UserRole,
  allowed: readonly UserRole[],
): boolean {
  return allowed.includes(userRole);
}
