/* ------------------------------------------------------------------ */
/*  Agent Tools — GPT-4o function calling definitions                   */
/*                                                                      */
/*  Each tool gives the agent structured access to business data so     */
/*  it reasons over real knowledge instead of hallucinating.            */
/* ------------------------------------------------------------------ */

import type { BusinessConfig } from "@/lib/businessUnits";

// ── OpenAI-compatible tool schema ──

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const agentToolDefinitions: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description:
        "ค้นหาข้อมูลจาก Knowledge Base และ FAQ ของธุรกิจ ใช้เมื่อลูกค้าถามเรื่องที่ต้องการข้อมูลเชิงลึก เช่น วิธีใช้งาน นโยบาย ข้อกำหนด",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "คำค้นหาที่เกี่ยวข้องกับสิ่งที่ลูกค้าถาม",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_sale_script",
      description:
        "ค้นหา sale script ที่เหมาะสม ใช้เมื่อลูกค้าถามเรื่องราคา โปรโมชั่น การผ่อน หรือต้องการปิดการขาย",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description:
              "หัวข้อที่ต้องการค้นหา เช่น 'ราคา', 'โปรโมชั่น', 'ผ่อน', 'เวลาทำการ', 'on-site'",
          },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_info",
      description:
        "ดึงข้อมูลสินค้าจาก catalog ใช้เมื่อลูกค้าถามสเปค ราคา หรือรายละเอียดสินค้าเฉพาะรุ่น",
      parameters: {
        type: "object",
        properties: {
          model_name: {
            type: "string",
            description:
              "ชื่อหรือรุ่นสินค้าที่ต้องการ เช่น 'EM Legend', 'BYD Atto 3', 'Owen LR'",
          },
          category: {
            type: "string",
            description:
              "หมวดหมู่สินค้า (optional) เช่น 'มอเตอร์ไซค์ไฟฟ้า EM', 'แบตเตอรี่ EV'",
          },
        },
        required: ["model_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_sentiment",
      description:
        "วิเคราะห์ความรู้สึกและระดับความเร่งด่วนของลูกค้า ใช้เพื่อตัดสินใจว่าควร escalate หรือ reassure ก่อน",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "ข้อความของลูกค้าที่ต้องการวิเคราะห์",
          },
          history_summary: {
            type: "string",
            description: "สรุปบทสนทนาล่าสุด (optional)",
          },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "flag_for_admin",
      description:
        "ทำเครื่องหมายการสนทนานี้ให้ admin ตรวจสอบ ใช้เมื่อลูกค้า: (1) โกรธมาก / ไม่พอใจ (2) มีปัญหาที่บอทแก้ไม่ได้ (3) ต้องการขอมัดจำหรือทำสัญญา (4) ถามเรื่องที่ไม่มีข้อมูลในระบบ",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "เหตุผลที่ต้อง flag เช่น 'ลูกค้าแสดงอาการโกรธ', 'ต้องการทำสัญญา', 'ถามเรื่องนอก scope'",
          },
          urgency: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "ระดับความเร่งด่วน",
          },
        },
        required: ["reason", "urgency"],
      },
    },
  },
];

// ── Tool executor ──

export interface ToolResult {
  tool: string;
  result: string;
  flaggedForAdmin?: boolean;
  urgency?: "low" | "medium" | "high";
  flagReason?: string;
}

export function executeAgentTool(
  toolName: string,
  args: Record<string, string>,
  biz: BusinessConfig
): ToolResult {
  switch (toolName) {
    case "search_knowledge": {
      const query = (args.query || "").toLowerCase();
      // Search knowledge docs
      const docHit = biz.knowledgeDocs.find((d) =>
        d.tags?.some((tag) => query.includes(tag.toLowerCase())) ||
        d.title.toLowerCase().split(" ").some((word) => word.length > 2 && query.includes(word)) ||
        d.content.toLowerCase().includes(query.slice(0, 20))
      );
      if (docHit) {
        return {
          tool: "search_knowledge",
          result: `[Knowledge: ${docHit.title}]\n${docHit.content}`,
        };
      }
      // Search FAQ
      const faqHit = biz.faqData.find(
        (f) =>
          f.question.toLowerCase().includes(query.slice(0, 15)) ||
          f.answer.toLowerCase().includes(query.slice(0, 15))
      );
      if (faqHit) {
        return {
          tool: "search_knowledge",
          result: `[FAQ] Q: ${faqHit.question}\nA: ${faqHit.answer}`,
        };
      }
      return {
        tool: "search_knowledge",
        result: "ไม่พบข้อมูลที่ตรงกับคำค้นหาในฐานข้อมูล",
      };
    }

    case "search_sale_script": {
      const topic = (args.topic || "").toLowerCase();
      const script = biz.saleScripts.find((s) =>
        s.triggers.some((trigger) =>
          topic.includes(trigger.toLowerCase()) ||
          trigger.toLowerCase().includes(topic.slice(0, 8))
        )
      );
      if (script) {
        return {
          tool: "search_sale_script",
          result: `[Sale Script #${script.id}]\n${script.adminReply}`,
        };
      }
      return {
        tool: "search_sale_script",
        result: "ไม่พบ sale script ที่ตรงกับหัวข้อนี้",
      };
    }

    case "get_product_info": {
      const modelName = (args.model_name || "").toLowerCase();
      const category = (args.category || "").toLowerCase();

      let products = biz.products;
      if (category) {
        products = products.filter((p) =>
          p.category.toLowerCase().includes(category)
        );
      }

      // Sort by name length desc (more specific first)
      const sorted = [...products].sort(
        (a, b) => b.name.length - a.name.length
      );

      const hit = sorted.find(
        (p) =>
          p.name.toLowerCase().includes(modelName) ||
          modelName.includes(p.name.toLowerCase()) ||
          p.tags.some(
            (tag) =>
              tag.length > 3 &&
              (modelName.includes(tag.toLowerCase()) ||
                tag.toLowerCase().includes(modelName))
          )
      );

      if (hit) {
        const status =
          hit.status === "discontinue"
            ? `⚠️ ยกเลิกจำหน่าย${hit.recommendedAlternative ? ` → แนะนำ: ${hit.recommendedAlternative}` : ""}`
            : "✅ พร้อมจำหน่าย";
        return {
          tool: "get_product_info",
          result: `[Product: ${hit.name}]\nราคา: ${hit.price.toLocaleString()} บาท\nหมวด: ${hit.category}\nสถานะ: ${status}\nรายละเอียด: ${hit.description}`,
        };
      }

      // Return top 3 in category if no specific match
      const topProducts = (category ? products : biz.getActiveProducts())
        .slice(0, 3)
        .map((p) => `- ${p.name}: ${p.price.toLocaleString()} บาท`)
        .join("\n");

      return {
        tool: "get_product_info",
        result: topProducts
          ? `ไม่พบสินค้าชื่อ "${args.model_name}" โดยตรง สินค้าที่ใกล้เคียงครับ:\n${topProducts}`
          : `ไม่พบสินค้าชื่อ "${args.model_name}" ในระบบ`,
      };
    }

    case "analyze_sentiment": {
      const msg = (args.message || "").toLowerCase();
      const angry = ["โกรธ", "หัวร้อน", "แย่มาก", "ห่วยแตก", "โกง", "ไม่พอใจ", "เอาเปรียบ", "!!!", "???", "ไม่ได้เรื่อง", "ขี้โกง"];
      const urgent = ["ด่วน", "urgent", "รีบ", "เร่งด่วน", "วันนี้เลย", "ไม่ได้แล้ว", "เสียทั้งวัน"];
      const sad = ["เสียใจ", "กังวล", "กลัว", "ไม่มั่นใจ", "เป็นห่วง", "เครียด"];

      const isAngry = angry.some((w) => msg.includes(w));
      const isUrgent = urgent.some((w) => msg.includes(w));
      const isSad = sad.some((w) => msg.includes(w));

      const sentiment = isAngry
        ? "negative-angry"
        : isUrgent
        ? "negative-urgent"
        : isSad
        ? "negative-worried"
        : "neutral-positive";

      const urgency: "high" | "medium" | "low" = isAngry
        ? "high"
        : isUrgent
        ? "high"
        : isSad
        ? "medium"
        : "low";

      return {
        tool: "analyze_sentiment",
        result: JSON.stringify({ sentiment, urgency, isAngry, isUrgent, isSad }),
      };
    }

    case "flag_for_admin": {
      const reason = args.reason || "ไม่ระบุเหตุผล";
      const urgency = (args.urgency as "low" | "medium" | "high") || "medium";
      return {
        tool: "flag_for_admin",
        result: `Flagged for admin review: ${reason} [urgency: ${urgency}]`,
        flaggedForAdmin: true,
        urgency,
        flagReason: reason,
      };
    }

    default:
      return { tool: toolName, result: "Unknown tool" };
  }
}
