import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { CustomerService } from "@/server/services/invoice/customer.service";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const customers = await CustomerService.list(session.companyId, search);

  return NextResponse.json(customers, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
