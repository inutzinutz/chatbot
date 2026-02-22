/* ------------------------------------------------------------------ */
/*  /api/vision — File analysis endpoint (Node.js runtime)             */
/*                                                                      */
/*  Accepts:                                                            */
/*    - Images (JPEG, PNG, WEBP, GIF) → GPT-4o Vision                  */
/*    - PDF → pdf-parse text → GPT-4o                                  */
/*                                                                      */
/*  POST body (JSON):                                                   */
/*    { fileData: string (base64), mimeType: string,                   */
/*      fileName: string, userPrompt?: string, businessId?: string }   */
/*                                                                      */
/*  Response: { content: string, fileType: string }                    */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { getBusinessConfig, DEFAULT_BUSINESS_ID } from "@/lib/businessUnits";
import {
  buildVisionSystemPrompt,
  buildVisionUserPrompt,
  buildPdfUserPrompt,
} from "@/lib/visionPrompt";
import { logTokenUsage } from "@/lib/tokenTracker";

export const runtime = "nodejs";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const SUPPORTED_DOC_TYPES = ["application/pdf"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      fileData: string;
      mimeType: string;
      fileName: string;
      userPrompt?: string;
      businessId?: string;
    };

    const { fileData, mimeType, fileName, userPrompt = "", businessId: reqBusinessId } = body;

    if (!fileData || !mimeType) {
      return NextResponse.json({ error: "fileData and mimeType are required" }, { status: 400 });
    }

    // Size check
    const approxBytes = Math.ceil(fileData.length * 0.75);
    if (approxBytes > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `ไฟล์ใหญ่เกิน ${MAX_FILE_SIZE_MB}MB กรุณาลดขนาดไฟล์ก่อนส่ง` },
        { status: 413 }
      );
    }

    const businessId = reqBusinessId || DEFAULT_BUSINESS_ID;
    const biz = getBusinessConfig(businessId);
    const systemPrompt = buildVisionSystemPrompt(biz);

    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // ── IMAGE ──
    if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
      const userMsg = buildVisionUserPrompt(userPrompt || undefined);

      if (openaiKey) {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o",
            max_tokens: 800,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileData}`, detail: "high" } },
                  { type: "text", text: userMsg },
                ],
              },
            ],
          }),
        });
        if (resp.ok) {
          const data = await resp.json() as { choices: { message: { content: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
          logTokenUsage({ businessId, model: "gpt-4o", callSite: "vision_image", promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 }).catch(() => {});
          return NextResponse.json({ content: data.choices?.[0]?.message?.content || "ไม่สามารถวิเคราะห์รูปได้", fileType: "image", fileName });
        }
      }

      if (anthropicKey) {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-opus-4-5",
            max_tokens: 800,
            system: systemPrompt,
            messages: [{
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mimeType, data: fileData } },
                { type: "text", text: userMsg },
              ],
            }],
          }),
        });
        if (resp.ok) {
          const data = await resp.json() as { content: { type: string; text: string }[]; usage?: { input_tokens: number; output_tokens: number } };
          logTokenUsage({ businessId, model: "claude-opus-4-5", callSite: "vision_image", promptTokens: data.usage?.input_tokens ?? 0, completionTokens: data.usage?.output_tokens ?? 0 }).catch(() => {});
          return NextResponse.json({ content: data.content?.find((c) => c.type === "text")?.text || "ไม่สามารถวิเคราะห์รูปได้", fileType: "image", fileName });
        }
      }

      return NextResponse.json(
        { error: "ไม่มี API key สำหรับวิเคราะห์รูปภาพ กรุณาตั้งค่า OPENAI_API_KEY หรือ ANTHROPIC_API_KEY" },
        { status: 503 }
      );
    }

    // ── PDF ──
    if (SUPPORTED_DOC_TYPES.includes(mimeType)) {
      let extractedText = "";
      try {
        const pdfParseModule = await import("pdf-parse");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParse: (buf: Buffer) => Promise<{ text: string }> = (pdfParseModule as any).default ?? (pdfParseModule as any);
        const buffer = Buffer.from(fileData, "base64");
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text?.trim() || "";
      } catch (pdfErr) {
        console.error("[vision] pdf-parse error:", pdfErr);
        return NextResponse.json({ error: "ไม่สามารถอ่าน PDF ได้ กรุณาตรวจสอบว่าไฟล์ไม่เสียหาย" }, { status: 422 });
      }

      if (!extractedText) {
        return NextResponse.json({ content: `ไฟล์ PDF "${fileName}" ไม่มีข้อความที่อ่านได้ (อาจเป็น PDF รูปภาพ) กรุณาส่งเป็นรูปภาพแทนครับ`, fileType: "pdf", fileName });
      }

      const prompt = buildPdfUserPrompt(fileName, extractedText, userPrompt || undefined);

      if (openaiKey) {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 800,
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
          }),
        });
        if (resp.ok) {
          const data = await resp.json() as { choices: { message: { content: string } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
          logTokenUsage({ businessId, model: "gpt-4o-mini", callSite: "vision_pdf", promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 }).catch(() => {});
          return NextResponse.json({ content: data.choices?.[0]?.message?.content || "ไม่สามารถสรุปเอกสารได้", fileType: "pdf", fileName });
        }
      }

      if (anthropicKey) {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 800,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (resp.ok) {
          const data = await resp.json() as { content: { type: string; text: string }[]; usage?: { input_tokens: number; output_tokens: number } };
          logTokenUsage({ businessId, model: "claude-haiku-4-5", callSite: "vision_pdf", promptTokens: data.usage?.input_tokens ?? 0, completionTokens: data.usage?.output_tokens ?? 0 }).catch(() => {});
          return NextResponse.json({ content: data.content?.find((c) => c.type === "text")?.text || "ไม่สามารถสรุปเอกสารได้", fileType: "pdf", fileName });
        }
      }
    }

    return NextResponse.json(
      { error: `ประเภทไฟล์ "${mimeType}" ยังไม่รองรับ\n\nรองรับ: รูปภาพ (JPEG, PNG, WEBP, GIF) และ PDF` },
      { status: 415 }
    );
  } catch (err) {
    console.error("[vision] error:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
  }
}
