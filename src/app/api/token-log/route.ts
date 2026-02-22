/* ------------------------------------------------------------------ */
/*  /api/token-log — Internal endpoint for edge-runtime token logging   */
/*                                                                      */
/*  Called by /api/chat (edge) via fire-and-forget fetch.               */
/*  Node.js runtime — can use ioredis directly.                         */
/*                                                                      */
/*  POST body: TokenUsageParams                                          */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { logTokenUsage, type TokenUsageParams } from "@/lib/tokenTracker";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as TokenUsageParams;
    await logTokenUsage(body);
    return NextResponse.json({ ok: true });
  } catch {
    // Non-fatal — edge caller ignores the response anyway
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
