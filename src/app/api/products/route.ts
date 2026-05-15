import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { ProductService } from "@/server/services/inventory/product.service";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") ?? 1);
  const search = searchParams.get("search") ?? undefined;
  const pageSize = Math.min(Number(searchParams.get("pageSize") ?? 25), 50);

  const result = await ProductService.list(session.companyId, {
    page,
    search,
    pageSize,
  });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=10" },
  });
}
