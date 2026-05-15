import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ExpenseService } from "@/server/services/expense/expense.service";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page = Number(request.nextUrl.searchParams.get("page") ?? 1);
  const year = request.nextUrl.searchParams.get("year");
  const from = year ? new Date(Number(year), 0, 1) : undefined;
  const to = year ? new Date(Number(year), 11, 31) : undefined;

  const result = await ExpenseService.list(session.companyId, { page, from, to });
  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=10" },
  });
}
