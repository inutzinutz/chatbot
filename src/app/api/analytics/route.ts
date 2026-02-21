import { NextResponse } from "next/server";
import { analyticsData } from "@/lib/analytics";

export async function GET() {
  return NextResponse.json(analyticsData);
}
