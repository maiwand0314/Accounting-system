import { requireSession } from "@/lib/auth/session";
import { ExpenseService } from "@/server/services/expense/expense.service";
import { VendorService } from "@/server/services/expense/vendor.service";
import { ExpenseList } from "@/components/expenses/expense-list";

export default async function UtgifterPage() {
  const session = await requireSession();
  const [accounts, vendors] = await Promise.all([
    ExpenseService.getExpenseAccounts(session.companyId),
    VendorService.list(session.companyId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Utgifter</h1>
        <p className="text-muted-foreground">
          Registrer utgifter med MVA, kvittering og automatisk bokføring
        </p>
      </div>
      <ExpenseList accounts={accounts} vendors={vendors} />
    </div>
  );
}
