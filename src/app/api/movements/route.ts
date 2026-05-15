import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { InventoryService } from "@/server/services/inventory/inventory.service";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? 1);
  const productId = searchParams.get("productId") ?? undefined;

  const result = await InventoryService.listMovements(session.companyId, {
    page,
    productId,
    pageSize: 20,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=10" },
  });
}
