/* ------------------------------------------------------------------ */
/*  Agent Loop — GPT-4o with function calling                          */
/*                                                                      */
/*  Called at L14 (pipeline fallback) when L0–L13 cannot handle the    */
/*  customer message. The agent:                                        */
/*    1. Receives full conversation context + business knowledge        */
/*    2. Decides which tools to call (search_knowledge, get_product,   */
/*       analyze_sentiment, flag_for_admin, etc.)                      */
/*    3. Iterates tool calls → synthesises a final reply               */
/*    4. Returns structured result including any admin flag signals     */
/* ------------------------------------------------------------------ */

import OpenAI from "openai";
import type { BusinessConfig } from "@/lib/businessUnits";
import type { ChatMessage } from "@/lib/pipeline";
import {
  agentToolDefinitions,
  executeAgentTool,
  type ToolResult,
} from "@/lib/agent/tools";
import { logTokenUsage } from "@/lib/tokenTracker";

// ── Types ──

export interface AgentResult {
  content: string;
  /** true when agent called flag_for_admin tool */
  flaggedForAdmin?: boolean;
  flagReason?: string;
  flagUrgency?: "low" | "medium" | "high";
  /** Tools the agent invoked (for tracing / inspector) */
  toolsUsed: string[];
  /** Number of reasoning iterations */
  iterations: number;
}

// ── Constants ──

const MAX_ITERATIONS = 5; // safety cap — prevents infinite tool loops

// ── Build agent system prompt ──

function buildAgentSystemPrompt(biz: BusinessConfig, offHoursNote?: string): string {
  const activeProducts = biz.getActiveProducts();
  const productSummary = activeProducts
    .slice(0, 20)
    .map(
      (p) =>
        `- ${p.name} | ${p.price.toLocaleString()} บาท | ${p.category}`
    )
    .join("\n");

  const categories = biz.getCategories().join(", ");

  return `${biz.systemPromptIdentity}

## บทบาทของคุณ (Agent Mode)
คุณคือ AI Agent ที่มีเครื่องมือ (tools) ในการค้นหาข้อมูลจริงจากระบบ
ก่อนตอบ ให้ใช้ tools เพื่อดึงข้อมูลที่ถูกต้องเสมอ — ห้ามเดาหรือสร้างข้อมูลขึ้นเอง

## หมวดหมู่สินค้า
${categories}

## สินค้าในระบบ (สรุป)
${productSummary}

## กระบวนการตอบ (สำคัญมาก)
1. วิเคราะห์ว่าลูกค้าต้องการอะไร
2. เรียก tool ที่เหมาะสมเพื่อดึงข้อมูลจริง
3. ถ้าลูกค้าดูเครียด/โกรธ ให้เรียก analyze_sentiment ก่อนเสมอ
4. ถ้าต้องการให้ admin ช่วย ให้เรียก flag_for_admin
5. สังเคราะห์คำตอบจากข้อมูลที่ได้จาก tools

## กฎเหล็ก
1. ห้ามยืนยันสต็อก — ตรวจสอบกับทีมงานเสมอ
2. ห้ามส่ง payment link
3. ราคาแสดงเป็นบาท รูปแบบ: 12,650 บาท
4. ถ้าไม่แน่ใจ ให้แนะนำติดต่อผ่านช่องทาง: ${biz.orderChannelsText.split("\n")[0]}
5. จบทุกคำตอบด้วยคำถามกลับหา/ข้อเสนอช่วยเหลือ
${offHoursNote ? `\n## สถานะเวลาทำการ:\n${offHoursNote}` : ""}
`;
}

// ── Main agent loop ──

export async function runAgentLoop(
  userMessage: string,
  conversationHistory: ChatMessage[],
  biz: BusinessConfig,
  conversationId?: string,
  offHoursNote?: string
): Promise<AgentResult> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const systemPrompt = buildAgentSystemPrompt(biz, offHoursNote);

  // Build message history for OpenAI (last 10 messages for context window)
  // Exclude the last message if it duplicates userMessage (chat/route already appends it below)
  const historySlice = conversationHistory.slice(-10);
  const lastMsg = historySlice[historySlice.length - 1];
  const historyWithoutLastUser =
    lastMsg?.role === "user" && lastMsg.content === userMessage
      ? historySlice.slice(0, -1)
      : historySlice;

  const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = historyWithoutLastUser
    .map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

  // Current conversation state — userMessage appended exactly once
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...historyMessages,
    { role: "user", content: userMessage },
  ];

  const toolsUsed: string[] = [];
  let flaggedForAdmin = false;
  let flagReason: string | undefined;
  let flagUrgency: "low" | "medium" | "high" | undefined;
  let iterations = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  // ── Agent loop ──
  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: agentToolDefinitions,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 800,
    });

    // Accumulate token usage across all iterations
    if (response.usage) {
      totalPromptTokens += response.usage.prompt_tokens ?? 0;
      totalCompletionTokens += response.usage.completion_tokens ?? 0;
    }

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    // Add assistant's response to messages
    messages.push(assistantMessage);

    // If no tool calls → we have the final answer
    if (
      choice.finish_reason === "stop" ||
      !assistantMessage.tool_calls ||
      assistantMessage.tool_calls.length === 0
    ) {
      const content = assistantMessage.content || biz.defaultFallbackMessage;
      // Log accumulated token usage (fire-and-forget)
      logTokenUsage({
        businessId: biz.id,
        model: "gpt-4o",
        callSite: "agent",
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        conversationId,
      }).catch(() => {});
      return {
        content,
        flaggedForAdmin,
        flagReason,
        flagUrgency: flagUrgency,
        toolsUsed,
        iterations,
      };
    }

    // ── Execute tool calls ──
    const toolResults: ToolResult[] = [];

    for (const toolCall of assistantMessage.tool_calls) {
      // Type guard — SDK v4+ uses 'function' property
      if (!("function" in toolCall)) continue;
      const tc = toolCall as { id: string; type: string; function: { name: string; arguments: string } };
      const fnName = tc.function.name;
      let args: Record<string, string> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        // ignore parse errors
      }

      const result = executeAgentTool(fnName, args, biz);
      toolResults.push(result);
      toolsUsed.push(fnName);

      // Track admin flags
      if (result.flaggedForAdmin) {
        flaggedForAdmin = true;
        flagReason = result.flagReason;
        flagUrgency = result.urgency;
      }

      // Add tool result to messages
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result.result,
      });
    }
  }

  // Safety: if we hit max iterations, return a safe fallback
  logTokenUsage({
    businessId: biz.id,
    model: "gpt-4o",
    callSite: "agent",
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    conversationId,
  }).catch(() => {});
  return {
    content: biz.defaultFallbackMessage,
    flaggedForAdmin,
    flagReason,
    flagUrgency,
    toolsUsed,
    iterations,
  };
}
