/* ------------------------------------------------------------------ */
/*  /api/agent — AI Agent endpoint (Node.js runtime)                   */
/*                                                                      */
/*  Called by /api/chat when pipeline reaches L14 (default fallback).  */
/*  Uses GPT-4o with function calling to reason over business data     */
/*  and produce a grounded, accurate response.                         */
/*                                                                      */
/*  POST body: { messages, businessId, userMessage }                   */
/*  Response:  { content, toolsUsed, iterations,                       */
/*               flaggedForAdmin?, flagReason?, flagUrgency? }          */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { getBusinessConfig, DEFAULT_BUSINESS_ID } from "@/lib/businessUnits";
import { runAgentLoop } from "@/lib/agent/agentLoop";
import { writeAgentFlag } from "@/lib/agent/agentMonitor";
import type { ChatMessage } from "@/lib/pipeline";

// Node.js runtime — required for ioredis and openai SDK
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      businessId: reqBusinessId,
      userMessage,
      conversationId,
    } = body as {
      messages: ChatMessage[];
      businessId?: string;
      userMessage: string;
      conversationId?: string;
    };

    const businessId = reqBusinessId || DEFAULT_BUSINESS_ID;
    const biz = getBusinessConfig(businessId);

    // Fetch business hours context
    let offHoursNote: string | undefined;
    try {
      const { getBusinessHours, checkBusinessHours } = await import("@/app/api/business-hours/route");
      const bhConfig = await getBusinessHours(businessId);
      if (bhConfig.enabled) {
        const status = checkBusinessHours(bhConfig);
        if (!status.isOpen) {
          offHoursNote = bhConfig.offHoursMessage;
        }
      }
    } catch {
      // non-fatal
    }

    // Run the agent loop
    const agentResult = await runAgentLoop(userMessage, messages, biz, conversationId, offHoursNote);

    // If agent flagged for admin — persist to Redis for the monitor
    if (agentResult.flaggedForAdmin && conversationId) {
      await writeAgentFlag({
        conversationId,
        businessId,
        reason: agentResult.flagReason || "Agent flagged",
        urgency: agentResult.flagUrgency || "medium",
        userMessage,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      content: agentResult.content,
      toolsUsed: agentResult.toolsUsed,
      iterations: agentResult.iterations,
      flaggedForAdmin: agentResult.flaggedForAdmin ?? false,
      flagReason: agentResult.flagReason,
      flagUrgency: agentResult.flagUrgency,
    });
  } catch (error) {
    console.error("[/api/agent] Error:", error);
    return NextResponse.json(
      { content: "ขออภัยครับ เกิดข้อผิดพลาดใน AI Agent กรุณาลองใหม่อีกครั้งครับ" },
      { status: 500 }
    );
  }
}
