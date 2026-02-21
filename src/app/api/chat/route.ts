import { NextRequest, NextResponse } from "next/server";
import { getBusinessConfig, DEFAULT_BUSINESS_ID } from "@/lib/businessUnits";
import type { PipelineTrace } from "@/lib/inspector";
import {
  generatePipelineResponseWithTrace,
  buildSystemPrompt,
  type ChatMessage,
} from "@/lib/pipeline";

export const runtime = "edge";

function now() {
  return performance.now();
}

// ─────────────────────────────────────────────────────────────
// POST handler — PIPELINE FIRST, GPT only on default fallback
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, businessId: reqBusinessId } = body as {
      messages: ChatMessage[];
      businessId?: string;
    };
    const userMessage = messages[messages.length - 1]?.content || "";
    const businessId = reqBusinessId || DEFAULT_BUSINESS_ID;
    const biz = getBusinessConfig(businessId);

    // ══════════════════════════════════════════════════════
    // STEP 1: ALWAYS run the 15-layer pipeline FIRST
    // ══════════════════════════════════════════════════════
    const { content: pipelineContent, trace: pipelineTrace } =
      generatePipelineResponseWithTrace(userMessage, messages, biz);

    // ══════════════════════════════════════════════════════
    // STEP 2: If pipeline resolved (layers 0-13), return it
    // ══════════════════════════════════════════════════════
    if (pipelineTrace.finalLayer < 14) {
      return NextResponse.json({
        content: pipelineContent,
        trace: pipelineTrace,
      });
    }

    // ══════════════════════════════════════════════════════
    // STEP 3: Pipeline reached Default Fallback (layer 14)
    //         → Try GPT as last resort
    // ══════════════════════════════════════════════════════

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // ── Priority 1: Anthropic Claude ──
    if (anthropicKey) {
      const systemPrompt = buildSystemPrompt(biz);

      const anthropicMessages = messages.slice(-10).map((m) => ({
        role: m.role === "system" ? ("user" as const) : m.role,
        content: m.content,
      }));

      const response = await fetch(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            system: systemPrompt,
            messages: anthropicMessages,
            stream: true,
          }),
        }
      );

      if (!response.ok) {
        // Claude failed — return pipeline result as fallback
        pipelineTrace.mode = "claude_fallback";
        return NextResponse.json({
          content: pipelineContent,
          trace: pipelineTrace,
        });
      }

      // Build trace: pipeline ran first (all 15 layers), then Claude
      const claudeTrace: PipelineTrace = {
        totalDurationMs: pipelineTrace.totalDurationMs,
        mode: "pipeline_then_claude",
        steps: [
          ...pipelineTrace.steps,
          {
            layer: 15,
            name: "Claude Sonnet",
            description:
              "Pipeline ไม่ match → ส่งไป Claude Sonnet แบบ streaming",
            status: "matched",
            durationMs: 0,
            details: {
              intent: `${messages.length} messages in context`,
            },
          },
        ],
        finalLayer: 15,
        finalLayerName: "Claude Sonnet (GPT fallback)",
        userMessage,
        timestamp: new Date().toISOString(),
      };

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const streamStart = now();

      const stream = new ReadableStream({
        async start(controller) {
          claudeTrace.totalDurationMs =
            Math.round((now() - streamStart + pipelineTrace.totalDurationMs) * 100) / 100;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ trace: claudeTrace })}\n\n`
            )
          );

          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          try {
            let buffer = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6).trim();
                  if (!data) continue;
                  try {
                    const parsed = JSON.parse(data);

                    if (
                      parsed.type === "content_block_delta" &&
                      parsed.delta?.type === "text_delta"
                    ) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`
                        )
                      );
                    }

                    if (parsed.type === "message_stop") {
                      controller.enqueue(
                        encoder.encode("data: [DONE]\n\n")
                      );
                    }
                  } catch {
                    // skip malformed
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ── Priority 2: OpenAI ──
    if (openaiKey) {
      const systemPrompt = buildSystemPrompt(biz);

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.slice(-10),
            ],
            temperature: 0.7,
            max_tokens: 1000,
            stream: true,
          }),
        }
      );

      if (!response.ok) {
        pipelineTrace.mode = "openai_fallback";
        return NextResponse.json({
          content: pipelineContent,
          trace: pipelineTrace,
        });
      }

      const openaiTrace: PipelineTrace = {
        totalDurationMs: pipelineTrace.totalDurationMs,
        mode: "pipeline_then_openai",
        steps: [
          ...pipelineTrace.steps,
          {
            layer: 15,
            name: "OpenAI GPT-4o-mini",
            description:
              "Pipeline ไม่ match → ส่งไป GPT-4o-mini แบบ streaming",
            status: "matched",
            durationMs: 0,
            details: {
              intent: `${messages.length} messages in context`,
            },
          },
        ],
        finalLayer: 15,
        finalLayerName: "OpenAI GPT-4o-mini (GPT fallback)",
        userMessage,
        timestamp: new Date().toISOString(),
      };

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const streamStart = now();

      const stream = new ReadableStream({
        async start(controller) {
          openaiTrace.totalDurationMs =
            Math.round((now() - streamStart + pipelineTrace.totalDurationMs) * 100) / 100;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ trace: openaiTrace })}\n\n`
            )
          );

          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          try {
            let buffer = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (trimmed.startsWith("data: ")) {
                  const data = trimmed.slice(6);
                  if (data === "[DONE]") {
                    controller.enqueue(
                      encoder.encode("data: [DONE]\n\n")
                    );
                    break;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    const content =
                      parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ content })}\n\n`
                        )
                      );
                    }
                  } catch {
                    // skip malformed chunks
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ── No API key: return pipeline default fallback ──
    return NextResponse.json({
      content: pipelineContent,
      trace: pipelineTrace,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        content:
          "ขออภัยครับ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้งครับ",
      },
      { status: 500 }
    );
  }
}
