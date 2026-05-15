/** System account codes — must match seeded chart of accounts */
export const ACCOUNT_CODES = {
  INVENTORY: "1400",
  ACCOUNTS_RECEIVABLE: "1500",
  BANK: "1920",
  INPUT_VAT: "2700",
  EQUITY: "2050",
  ACCOUNTS_PAYABLE: "2400",
  OUTPUT_VAT: "2740",
  SALES_GOODS: "3000",
  SALES_SERVICES: "3100",
  COGS: "4000",
} as const;

export type AccountCode = (typeof ACCOUNT_CODES)[keyof typeof ACCOUNT_CODES];
