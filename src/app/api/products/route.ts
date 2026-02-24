import { NextRequest, NextResponse } from "next/server";
import { products as dji13products } from "@/lib/products";
import { products as evlifeProducts } from "@/lib/evlife/products";
import { products as dji13serviceProducts } from "@/lib/dji13support/products";

function getProductsByBusiness(businessId: string) {
  switch (businessId) {
    case "evlifethailand":
      return evlifeProducts;
    case "dji13support":
      return dji13serviceProducts;
    default:
      return dji13products;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId") || "dji13store";
    const query = searchParams.get("q")?.toLowerCase() || "";
    const category = searchParams.get("category")?.toLowerCase() || "";
    const status = searchParams.get("status")?.toLowerCase() || "";

    let filtered = [...getProductsByBusiness(businessId)];

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
  } catch (err) {
    console.error("[products] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
