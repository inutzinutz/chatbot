/* ------------------------------------------------------------------ */
/*  /api/tuning — Redis-backed CRUD for all Tuning AI data              */
/*                                                                      */
/*  Replaces localStorage for: products, sale-scripts, knowledge,       */
/*  intents, promotions, quick-replies, shipping                        */
/*                                                                      */
/*  Redis key schema:                                                    */
/*    tuning:{businessId}:{type}   → JSON array (full list)             */
/*                                                                      */
/*  GET  ?businessId=&type=products|sale-scripts|knowledge|intents|     */
/*            promotions|quick-replies|shipping                         */
/*  POST { action:"save", businessId, type, items }   → upsert all     */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, unauthorizedResponse } from "@/lib/auth";
import { getBusinessConfig } from "@/lib/businessUnits";

// ── Redis singleton (same pattern as other API routes) ─────────────────
function getRedis() {
  const g = globalThis as unknown as { __redis?: import("ioredis").default };
  return g.__redis ?? null;
}

export const runtime = "nodejs";

// ── Seed data helpers ──────────────────────────────────────────────────

type TuningType =
  | "products"
  | "sale-scripts"
  | "knowledge"
  | "intents"
  | "promotions"
  | "quick-replies"
  | "shipping";

const VALID_TYPES: TuningType[] = [
  "products",
  "sale-scripts",
  "knowledge",
  "intents",
  "promotions",
  "quick-replies",
  "shipping",
];

// Seed data — matches what was previously in localStorage initializers
import type { Product } from "@/lib/products";
import type { SaleScript } from "@/lib/saleScripts";
import type { KnowledgeDoc } from "@/lib/knowledgeDocs";
import type { Intent } from "@/lib/intentPolicies";

// Promotions type (inline — same as PromotionsPage)
interface Promotion {
  id: number;
  title: string;
  description: string;
  discountType: "percent" | "fixed" | "freebie";
  discountValue: string;
  conditions: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

// QuickReply type
interface QuickReplyItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

// ShippingRule type
interface ShippingRule {
  id: number;
  zone: string;
  description: string;
  fee: number;
  freeAbove: number | null;
  estimatedDays: string;
  active: boolean;
}

const SEED_PROMOTIONS: Record<string, Promotion[]> = {
  dji13store: [
    { id: 1, title: "DJI Mini 4 Pro ลด 10%", description: "ลดราคา 10% สำหรับ DJI Mini 4 Pro ทุกแพ็กเกจ", discountType: "percent", discountValue: "10", conditions: "ไม่สามารถใช้ร่วมกับโปรโมชั่นอื่นได้", startDate: "2026-01-01", endDate: "2026-03-31", active: true },
    { id: 2, title: "DJI Avata 2 แถม DJI Care Refresh", description: "ซื้อ DJI Avata 2 Fly More Combo แถม DJI Care Refresh 1 ปี", discountType: "freebie", discountValue: "DJI Care Refresh 1 Year", conditions: "เฉพาะ Fly More Combo เท่านั้น", startDate: "2026-01-15", endDate: "2026-02-28", active: true },
    { id: 3, title: "ผ่อน 0% สูงสุด 10 เดือน", description: "ผ่อน 0% สำหรับบัตรเครดิตที่ร่วมรายการ ทุกรุ่น", discountType: "percent", discountValue: "0% installment", conditions: "เฉพาะบัตรเครดิต SCB, KBANK, KTC, BAY", startDate: "2026-01-01", endDate: "2026-12-31", active: true },
    { id: 4, title: "ส่งฟรีทั่วประเทศ", description: "จัดส่งฟรีทุกรายการสินค้า DJI ทั่วประเทศไทย", discountType: "fixed", discountValue: "Free shipping", conditions: "ไม่มีขั้นต่ำ", startDate: "2026-01-01", endDate: "2026-12-31", active: true },
  ],
  evlifethailand: [
    { id: 1, title: "แบตเตอรี่ LiFePO4 ลด 500 บาท", description: "ลดทันที 500 บาท สำหรับแบตเตอรี่ LiFePO4 12V", discountType: "fixed", discountValue: "500", conditions: "ไม่สามารถใช้ร่วมกับโปรโมชั่นอื่นได้", startDate: "2026-01-01", endDate: "2026-03-31", active: true },
    { id: 2, title: "EM Milano แถมหมวกกันน็อค", description: "ซื้อ EM Milano แถมหมวกกันน็อคฟรี 1 ใบ มูลค่า 1,500 บาท", discountType: "freebie", discountValue: "หมวกกันน็อค 1 ใบ", conditions: "เฉพาะรุ่น Milano เท่านั้น", startDate: "2026-01-15", endDate: "2026-02-28", active: true },
    { id: 3, title: "ผ่อน 0% สูงสุด 6 เดือน", description: "ผ่อน 0% สำหรับมอเตอร์ไซค์ไฟฟ้า EM ทุกรุ่น", discountType: "percent", discountValue: "0% installment", conditions: "เฉพาะบัตรเครดิตที่ร่วมรายการ", startDate: "2026-01-01", endDate: "2026-12-31", active: true },
    { id: 4, title: "บริการ On-site ฟรี กรุงเทพฯ-ปริมณฑล", description: "บริการเปลี่ยนแบตเตอรี่ถึงบ้านฟรี", discountType: "fixed", discountValue: "Free on-site", conditions: "เฉพาะพื้นที่กรุงเทพฯ และปริมณฑล", startDate: "2026-01-01", endDate: "2026-12-31", active: true },
  ],
  dji13support: [
    { id: 1, title: "ประเมินฟรี ไม่มีค่าใช้จ่าย", description: "ตรวจสอบและประเมินราคาซ่อมโดรน DJI ทุกรุ่นฟรี", discountType: "fixed", discountValue: "Free diagnosis", conditions: "ต้องนำโดรนมาที่ร้านหรือส่งทางไปรษณีย์", startDate: "2026-01-01", endDate: "2026-12-31", active: true },
    { id: 2, title: "Firmware Update ฟรี", description: "อัปเดต Firmware โดรน DJI และ Calibrate Gimbal/IMU/Compass ฟรีค่าบริการ", discountType: "fixed", discountValue: "Free service", conditions: "ต้องนำโดรนมาที่ร้านเท่านั้น", startDate: "2026-01-01", endDate: "2026-12-31", active: true },
    { id: 3, title: "เคลม DJI Care Refresh — ช่วยดำเนินการฟรี", description: "ให้ทีมงาน DJI 13 Service Plus ช่วยยื่นเรื่องเคลม DJI Care Refresh ฟรีค่าดำเนินการ", discountType: "fixed", discountValue: "Free claim assistance", conditions: "ลูกค้าต้องมี DJI Care Refresh ที่ยังไม่หมดอายุ", startDate: "2026-01-01", endDate: "2026-12-31", active: true },
    { id: 4, title: "ส่วนลดซ่อมโดรน DJI สำหรับลูกค้าขาประจำ", description: "ลูกค้าที่ซ่อมกับเรามาแล้วมากกว่า 2 ครั้ง รับส่วนลดค่าซ่อม 10%", discountType: "percent", discountValue: "10", conditions: "แสดงประวัติการซ่อมหรือแจ้ง LINE ID", startDate: "2026-01-01", endDate: "2026-12-31", active: true },
  ],
};

const SEED_SHIPPING: Record<string, ShippingRule[]> = {
  dji13store: [
    { id: 1, zone: "กรุงเทพและปริมณฑล", description: "จัดส่งด่วนภายใน 1-2 วันทำการ", fee: 0, freeAbove: null, estimatedDays: "1-2 วันทำการ", active: true },
    { id: 2, zone: "ต่างจังหวัด", description: "จัดส่งทั่วประเทศ ส่งฟรีสำหรับสินค้า DJI ทุกรายการ", fee: 0, freeAbove: null, estimatedDays: "2-4 วันทำการ", active: true },
    { id: 3, zone: "จัดส่งด่วน (Express)", description: "บริการจัดส่งด่วนพิเศษ ถึงภายใน 1 วัน", fee: 100, freeAbove: 10000, estimatedDays: "1 วันทำการ", active: true },
    { id: 4, zone: "ต่างประเทศ (International)", description: "สำหรับลูกค้าต่างประเทศ กรุณาติดต่อ LINE @dji13store", fee: 0, freeAbove: null, estimatedDays: "ติดต่อสอบถาม", active: false },
  ],
  evlifethailand: [
    { id: 1, zone: "กรุงเทพและปริมณฑล (On-site)", description: "บริการ On-site ติดตั้งถึงบ้าน ฟรีค่าเดินทาง", fee: 0, freeAbove: null, estimatedDays: "นัดหมายล่วงหน้า 1-2 วัน", active: true },
    { id: 2, zone: "กรุงเทพและปริมณฑล (จัดส่ง)", description: "จัดส่งด่วนภายใน 1-2 วันทำการ", fee: 0, freeAbove: null, estimatedDays: "1-2 วันทำการ", active: true },
    { id: 3, zone: "ต่างจังหวัด", description: "จัดส่งทั่วประเทศ ฟรีสำหรับแบตเตอรี่และมอเตอร์ไซค์", fee: 0, freeAbove: null, estimatedDays: "2-5 วันทำการ", active: true },
    { id: 4, zone: "ต่างจังหวัด (On-site)", description: "บริการ On-site ต่างจังหวัด มีค่าเดินทางตามระยะทาง", fee: 500, freeAbove: 5000, estimatedDays: "นัดหมายล่วงหน้า 3-5 วัน", active: true },
  ],
  dji13support: [
    { id: 1, zone: "รับที่ร้าน (Walk-in)", description: "นำโดรนมาที่ร้าน DJI 13 Service Plus โดยตรง ประเมินฟรีทันที", fee: 0, freeAbove: null, estimatedDays: "รอประเมิน 1-2 ชั่วโมง | ซ่อมตามสภาพ", active: true },
    { id: 2, zone: "ส่งซ่อมทางไปรษณีย์ (ส่งมาที่ร้าน)", description: "ลูกค้าออกค่าส่งมาเอง แนะนำ Kerry / Flash Express ห่อกล่องให้แน่น", fee: 0, freeAbove: null, estimatedDays: "รอรับ 1-2 วัน | ซ่อมตามสภาพ", active: true },
    { id: 3, zone: "ส่งคืน (ค่าส่งกลับ)", description: "ค่าส่งกลับลูกค้าออก ทั่วประเทศ Kerry / Flash", fee: 60, freeAbove: 5000, estimatedDays: "1-3 วันทำการหลังส่ง", active: true },
    { id: 4, zone: "ส่งคืน Express (ด่วน)", description: "บริการจัดส่งด่วนคืนโดรนที่ซ่อมแล้ว ภายใน 1 วัน", fee: 150, freeAbove: null, estimatedDays: "1 วันทำการ", active: true },
  ],
};

// ── Redis key ──────────────────────────────────────────────────────────

function redisKey(businessId: string, type: TuningType): string {
  return `tuning:${businessId}:${type}`;
}

// ── Get seed for type ──────────────────────────────────────────────────

function getSeed(businessId: string, type: TuningType, config: ReturnType<typeof getBusinessConfig>): unknown[] {
  switch (type) {
    case "products":      return [...(config.products as Product[])];
    case "sale-scripts":  return [...(config.saleScripts as SaleScript[])];
    case "knowledge":     return [...(config.knowledgeDocs as KnowledgeDoc[])];
    case "intents":       return [...(config.intents as Intent[])];
    case "promotions":    return [...(SEED_PROMOTIONS[businessId] ?? SEED_PROMOTIONS.dji13store)];
    case "quick-replies": return (config.faqData as { question: string; answer: string; category: string }[]).map((f, i) => ({ ...f, id: i + 1 }));
    case "shipping":      return [...(SEED_SHIPPING[businessId] ?? SEED_SHIPPING.dji13store)];
    default:              return [];
  }
}

// ── GET ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId") ?? "";
  const type = searchParams.get("type") as TuningType | null;

  if (!businessId || !type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Missing businessId or invalid type" }, { status: 400 });
  }

  const session = await requireAdminSession(req, businessId);
  if (!session) return unauthorizedResponse();

  try {
    const config = getBusinessConfig(businessId);
    const seed = getSeed(businessId, type, config);
    const redis = getRedis();

    if (!redis) {
      // No Redis available — return seed data directly
      return NextResponse.json({ items: seed });
    }

    const key = redisKey(businessId, type);
    const raw = await redis.get(key);

    if (raw) {
      return NextResponse.json({ items: JSON.parse(raw) });
    }

    // First load — seed from static config and persist
    await redis.set(key, JSON.stringify(seed));
    return NextResponse.json({ items: seed });
  } catch (err) {
    console.error("[tuning GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { action: string; businessId: string; type: TuningType; items: unknown[] };
    const { action, businessId, type, items } = body;

    if (!businessId || !type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const session = await requireAdminSession(req, businessId);
    if (!session) return unauthorizedResponse();

    if (action === "save") {
      const redis = getRedis();
      if (!redis) return NextResponse.json({ ok: true, items }); // no-op without Redis
      const key = redisKey(businessId, type);
      await redis.set(key, JSON.stringify(items ?? []));
      return NextResponse.json({ ok: true, items });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[tuning POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
