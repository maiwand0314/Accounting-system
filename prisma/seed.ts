import { PrismaClient, AccountType, EntityType } from "@prisma/client";

const prisma = new PrismaClient();

/** Simplified NS 4102-inspired chart of accounts for Norwegian AS */
const CHART_OF_ACCOUNTS: {
  code: string;
  name: string;
  type: AccountType;
  isSystem: boolean;
}[] = [
  // Eiendeler
  { code: "1400", name: "Varelager", type: "ASSET", isSystem: true },
  { code: "1500", name: "Kundefordringer", type: "ASSET", isSystem: true },
  { code: "1920", name: "Bankinnskudd", type: "ASSET", isSystem: true },
  { code: "2700", name: "Inngående MVA", type: "ASSET", isSystem: true },
  // Egenkapital og gjeld
  { code: "2050", name: "Annen egenkapital", type: "EQUITY", isSystem: true },
  { code: "2400", name: "Leverandørgjeld", type: "LIABILITY", isSystem: true },
  { code: "2740", name: "Utgående MVA", type: "LIABILITY", isSystem: true },
  // Inntekter
  { code: "3000", name: "Salgsinntekt varer", type: "REVENUE", isSystem: true },
  { code: "3100", name: "Salgsinntekt tjenester", type: "REVENUE", isSystem: true },
  // Kostnader
  { code: "4000", name: "Varekostnad", type: "EXPENSE", isSystem: true },
  { code: "4300", name: "Frakt og transport", type: "EXPENSE", isSystem: false },
  { code: "6700", name: "Kontorrekvisita", type: "EXPENSE", isSystem: false },
  { code: "6800", name: "Programvare og lisenser", type: "EXPENSE", isSystem: false },
  { code: "7140", name: "Reisekostnader", type: "EXPENSE", isSystem: false },
];

async function main() {
  const orgNumber = "999999999";

  const company = await prisma.company.upsert({
    where: { orgNumber },
    update: {},
    create: {
      name: "Demo AS",
      orgNumber,
      vatNumber: "NO999999999MVA",
      entityType: EntityType.AS,
      address: "Eksempelveien 1",
      city: "Oslo",
      postalCode: "0150",
      email: "post@demo-as.no",
    },
  });

  for (const account of CHART_OF_ACCOUNTS) {
    await prisma.account.upsert({
      where: {
        companyId_code: { companyId: company.id, code: account.code },
      },
      update: { name: account.name, type: account.type },
      create: {
        companyId: company.id,
        code: account.code,
        name: account.name,
        type: account.type,
        isSystem: account.isSystem,
      },
    });
  }

  const year = new Date().getFullYear();
  await prisma.invoiceSequence.upsert({
    where: { companyId_year: { companyId: company.id, year } },
    update: {},
    create: { companyId: company.id, year, lastNumber: 0 },
  });

  await prisma.journalSequence.upsert({
    where: { companyId_year: { companyId: company.id, year } },
    update: {},
    create: { companyId: company.id, year, lastNumber: 0 },
  });

  console.log(`✓ Selskap: ${company.name} (${company.id})`);
  console.log(`✓ Kontoplan: ${CHART_OF_ACCOUNTS.length} kontoer`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
