import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { InvoiceService } from "@/server/services/invoice/invoice.service";
import type { InvoiceStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? 1);
  const status = searchParams.get("status") as InvoiceStatus | null;

  const result = await InvoiceService.list(session.companyId, {
    page,
    status: status ?? undefined,
    pageSize: 20,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=10" },
  });
}
