import { NextRequest, NextResponse } from "next/server";
import { products } from "@/lib/products";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase() || "";
  const category = searchParams.get("category")?.toLowerCase() || "";
  const status = searchParams.get("status")?.toLowerCase() || "";

  let filtered = [...products];

  if (query) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
    );
  }

  if (category) {
    filtered = filtered.filter(
      (p) => p.category.toLowerCase() === category
    );
  }

  if (status) {
    filtered = filtered.filter(
      (p) => p.status?.toLowerCase() === status
    );
  }

  return NextResponse.json({
    total: filtered.length,
    products: filtered,
  });
}
