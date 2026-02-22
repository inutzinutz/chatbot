/* ------------------------------------------------------------------ */
/*  Business Unit Registry — maps business IDs to their data sets     */
/* ------------------------------------------------------------------ */

// DJI 13 STORE data
import {
  products as djiProducts,
  searchProducts as djiSearchProducts,
  getCategories as djiGetCategories,
  getActiveProducts as djiGetActiveProducts,
  getCheapestProducts as djiGetCheapestProducts,
  getProductsByCategory as djiGetProductsByCategory,
  type Product,
} from "@/lib/products";
import { faqData as djiFaqData } from "@/lib/faq";
import { saleScripts as djiSaleScripts, matchSaleScript as djiMatchSaleScript } from "@/lib/saleScripts";
import { knowledgeDocs as djiKnowledgeDocs, matchKnowledgeDoc as djiMatchKnowledgeDoc } from "@/lib/knowledgeDocs";
import {
  intents as djiIntents,
  matchAdminEscalation as djiMatchAdminEscalation,
  matchStockInquiry as djiMatchStockInquiry,
  matchVatRefund as djiMatchVatRefund,
  matchContactIntent as djiMatchContactIntent,
  matchDiscontinued as djiMatchDiscontinued,
  buildAdminEscalationResponse as djiBuildAdminEscalationResponse,
  buildStockCheckResponse as djiBuildStockCheckResponse,
  buildVatRefundResponse as djiBuildVatRefundResponse,
  buildContactChannelsResponse as djiBuildContactChannelsResponse,
  buildDiscontinuedResponse as djiBuildDiscontinuedResponse,
  type Intent,
  type DiscontinuedMapping,
} from "@/lib/intentPolicies";

// EV Life Thailand data
import {
  products as evlifeProducts,
  searchProducts as evlifeSearchProducts,
  getCategories as evlifeGetCategories,
  getActiveProducts as evlifeGetActiveProducts,
  getCheapestProducts as evlifeGetCheapestProducts,
  getProductsByCategory as evlifeGetProductsByCategory,
} from "@/lib/evlife/products";
import { faqData as evlifeFaqData } from "@/lib/evlife/faq";
import { saleScripts as evlifeSaleScripts, matchSaleScript as evlifeMatchSaleScript } from "@/lib/evlife/saleScripts";
import { knowledgeDocs as evlifeKnowledgeDocs, matchKnowledgeDoc as evlifeMatchKnowledgeDoc } from "@/lib/evlife/knowledgeDocs";
import {
  intents as evlifeIntents,
  matchAdminEscalation as evlifeMatchAdminEscalation,
  matchStockInquiry as evlifeMatchStockInquiry,
  matchVatRefund as evlifeMatchVatRefund,
  matchContactIntent as evlifeMatchContactIntent,
  matchDiscontinued as evlifeMatchDiscontinued,
  buildAdminEscalationResponse as evlifeBuildAdminEscalationResponse,
  buildStockCheckResponse as evlifeBuildStockCheckResponse,
  buildVatRefundResponse as evlifeBuildVatRefundResponse,
  buildContactChannelsResponse as evlifeBuildContactChannelsResponse,
  buildDiscontinuedResponse as evlifeBuildDiscontinuedResponse,
} from "@/lib/evlife/intentPolicies";

// DJI 13 Service Plus data
import {
  products as svcProducts,
  searchProducts as svcSearchProducts,
  getCategories as svcGetCategories,
  getActiveProducts as svcGetActiveProducts,
  getCheapestProducts as svcGetCheapestProducts,
  getProductsByCategory as svcGetProductsByCategory,
} from "@/lib/dji13service/products";
import { faqData as svcFaqData } from "@/lib/dji13service/faq";
import { saleScripts as svcSaleScripts, matchSaleScript as svcMatchSaleScript } from "@/lib/dji13service/saleScripts";
import { knowledgeDocs as svcKnowledgeDocs, matchKnowledgeDoc as svcMatchKnowledgeDoc } from "@/lib/dji13service/knowledgeDocs";
import {
  intents as svcIntents,
  matchAdminEscalation as svcMatchAdminEscalation,
  matchStockInquiry as svcMatchStockInquiry,
  matchVatRefund as svcMatchVatRefund,
  matchContactIntent as svcMatchContactIntent,
  matchDiscontinued as svcMatchDiscontinued,
  buildAdminEscalationResponse as svcBuildAdminEscalationResponse,
  buildStockCheckResponse as svcBuildStockCheckResponse,
  buildVatRefundResponse as svcBuildVatRefundResponse,
  buildContactChannelsResponse as svcBuildContactChannelsResponse,
  buildDiscontinuedResponse as svcBuildDiscontinuedResponse,
} from "@/lib/dji13service/intentPolicies";
import { channels as svcChannels } from "@/lib/dji13service/channels";
import { analyticsData as svcAnalyticsData } from "@/lib/dji13service/analytics";

// Channels data
import { channels as djiChannels, type ChannelInfo } from "@/lib/channels";
import { channels as evlifeChannels } from "@/lib/evlife/channels";

// Analytics data
import { analyticsData as djiAnalyticsData, type AnalyticsData } from "@/lib/analytics";
import { analyticsData as evlifeAnalyticsData } from "@/lib/evlife/analytics";

/* ------------------------------------------------------------------ */
/*  BusinessConfig — everything the pipeline needs for one business   */
/* ------------------------------------------------------------------ */

export interface BusinessFeatures {
  /** Allow customers to send images/files for AI vision analysis (web chat + LINE) */
  visionEnabled: boolean;
  /** Max file size in MB for vision uploads */
  visionMaxMB: number;
  /** Reply when video is sent via LINE (vision can't process video directly) */
  videoReplyEnabled: boolean;
}

export interface BusinessConfig {
  id: string;
  name: string;
  shortName: string;
  description: string;
  primaryColor: string;
  /** Feature flags — can be toggled per business */
  features: BusinessFeatures;
  /** All products in catalog */
  products: Product[];
  /** FAQ data */
  faqData: { question: string; answer: string; category: string }[];
  /** Sale scripts */
  saleScripts: { id: number; triggers: string[]; customerExample: string; adminReply: string; tags: string[] }[];
  /** Knowledge docs */
  knowledgeDocs: { id: number; title: string; content: string; triggers: string[]; tags: string[] }[];
  /** Intent policies */
  intents: Intent[];
  /** Channel configurations */
  channels: ChannelInfo[];
  /** Analytics mock data */
  analyticsData: AnalyticsData;

  // ── Functions ──
  searchProducts: (query: string) => Product[];
  getCategories: () => string[];
  getActiveProducts: () => Product[];
  getCheapestProducts: (limit?: number) => Product[];
  getProductsByCategory: (category: string) => Product[];

  matchSaleScript: (message: string) => { id: number; triggers: string[]; customerExample: string; adminReply: string; tags: string[] } | undefined;
  matchKnowledgeDoc: (message: string) => { id: number; title: string; content: string; triggers: string[]; tags: string[] } | undefined;

  matchAdminEscalation: (message: string) => boolean;
  matchStockInquiry: (message: string) => boolean;
  matchVatRefund: (message: string) => boolean;
  matchContactIntent: (message: string) => boolean;
  matchDiscontinued: (message: string) => DiscontinuedMapping | undefined;

  buildAdminEscalationResponse: () => string;
  buildStockCheckResponse: () => string;
  buildVatRefundResponse: () => string;
  buildContactChannelsResponse: () => string;
  buildDiscontinuedResponse: (mapping: DiscontinuedMapping) => string;

  /** System prompt identity text (for GPT) */
  systemPromptIdentity: string;
  /** Order channels text (e.g. LINE, Facebook, phone) */
  orderChannelsText: string;
  /** Default fallback message when nothing matches */
  defaultFallbackMessage: string;
  /** Category-specific search config */
  categoryChecks: { keys: string[]; category: string; label: string }[];
  /** FAQ term mapping for Layer 9 */
  faqTerms: { keys: string[]; topic: string }[];
}

/* ------------------------------------------------------------------ */
/*  DJI 13 STORE config                                               */
/* ------------------------------------------------------------------ */

const djiConfig: BusinessConfig = {
  id: "dji13store",
  name: "DJI 13 STORE",
  shortName: "DJI 13",
  description: "ตัวแทนจำหน่าย DJI อย่างเป็นทางการ",
  primaryColor: "#3b82f6",

  features: {
    visionEnabled: true,
    visionMaxMB: 10,
    videoReplyEnabled: true,
  },

  products: djiProducts,
  faqData: djiFaqData,
  saleScripts: djiSaleScripts,
  knowledgeDocs: djiKnowledgeDocs,
  intents: djiIntents,
  channels: djiChannels,
  analyticsData: djiAnalyticsData,

  searchProducts: djiSearchProducts,
  getCategories: djiGetCategories,
  getActiveProducts: djiGetActiveProducts,
  getCheapestProducts: djiGetCheapestProducts,
  getProductsByCategory: djiGetProductsByCategory,

  matchSaleScript: djiMatchSaleScript,
  matchKnowledgeDoc: djiMatchKnowledgeDoc,

  matchAdminEscalation: djiMatchAdminEscalation,
  matchStockInquiry: djiMatchStockInquiry,
  matchVatRefund: djiMatchVatRefund,
  matchContactIntent: djiMatchContactIntent,
  matchDiscontinued: djiMatchDiscontinued,

  buildAdminEscalationResponse: djiBuildAdminEscalationResponse,
  buildStockCheckResponse: djiBuildStockCheckResponse,
  buildVatRefundResponse: djiBuildVatRefundResponse,
  buildContactChannelsResponse: djiBuildContactChannelsResponse,
  buildDiscontinuedResponse: djiBuildDiscontinuedResponse,

  systemPromptIdentity: `คุณคือ "DJI 13 STORE Assistant" ผู้ช่วย AI ของร้าน DJI 13 STORE ตัวแทนจำหน่าย DJI อย่างเป็นทางการ บน DroidMind
ตอบภาษาไทยเป็นหลัก ตอบภาษาอังกฤษได้ถ้าลูกค้าถามเป็นภาษาอังกฤษ`,

  orderChannelsText: "- LINE: @dji13store (แนะนำ)\n- Facebook: DJI 13 Store\n- โทร: 065-694-6155",

  defaultFallbackMessage:
    "ขอบคุณที่ติดต่อ **DJI 13 STORE** ครับ!\n\nผมช่วยได้เรื่องเหล่านี้ครับ:\n- โดรน DJI ทุกรุ่น\n- กล้องแอคชั่น Osmo\n- กิมบอลกันสั่น\n- อุปกรณ์เสริม\n- ราคาและโปรโมชั่น\n- การจัดส่ง/รับประกัน\n\nลองพิมพ์ชื่อสินค้า เช่น 'Avata 2' หรือ 'Osmo Action 5 Pro' ได้เลยครับ!",

  categoryChecks: [
    { keys: ["โดรน", "drone", "บิน"], category: "Drone", label: "โดรน DJI" },
    { keys: ["action", "กล้อง", "osmo", "แอคชั่น"], category: "Action Camera", label: "กล้องแอคชั่น DJI" },
    { keys: ["gimbal", "กิมบอล", "กันสั่น", "stabilizer"], category: "Gimbal", label: "กิมบอล DJI" },
    { keys: ["ถูก", "ประหยัด", "งบน้อย", "budget", "cheap", "ราคาเริ่มต้น"], category: "Budget", label: "สินค้าราคาเริ่มต้น" },
  ],

  faqTerms: [
    { keys: ["สั่งซื้อ", "สั่ง", "order", "buy", "ซื้อยังไง"], topic: "สั่งซื้อ" },
    { keys: ["ผ่อน", "installment", "บัตรเครดิต", "0%", "ชำระ", "payment"], topic: "ชำระเงิน" },
    { keys: ["ส่ง", "จัดส่ง", "shipping", "delivery", "ค่าส่ง", "กี่วัน"], topic: "จัดส่ง" },
    { keys: ["คืน", "เปลี่ยน", "return", "refund"], topic: "คืนสินค้า" },
    { keys: ["ประกัน", "warranty", "เคลม", "care refresh", "service plus"], topic: "รับประกัน" },
    { keys: ["จดทะเบียน", "ทะเบียน", "กฎหมาย", "register", "กสทช", "caat"], topic: "จดทะเบียน" },
    { keys: ["เปรียบเทียบ", "ต่างกัน", "fly more", "fly smart", "compare", "vs"], topic: "เปรียบเทียบ" },
    { keys: ["โปร", "ส่วนลด", "discount", "promotion", "coupon"], topic: "โปรโมชั่น" },
  ],
};

/* ------------------------------------------------------------------ */
/*  EV Life Thailand config                                           */
/* ------------------------------------------------------------------ */

const evlifeConfig: BusinessConfig = {
  id: "evlifethailand",
  name: "EV Life Thailand",
  shortName: "EV Life",
  description: "ผู้เชี่ยวชาญแบตเตอรี่ LiFePO4 สำหรับรถ EV & ตัวแทน EM",
  primaryColor: "#f97316",

  features: {
    visionEnabled: true,
    visionMaxMB: 10,
    videoReplyEnabled: true,
  },

  products: evlifeProducts,
  faqData: evlifeFaqData,
  saleScripts: evlifeSaleScripts,
  knowledgeDocs: evlifeKnowledgeDocs,
  intents: evlifeIntents,
  channels: evlifeChannels,
  analyticsData: evlifeAnalyticsData,

  searchProducts: evlifeSearchProducts,
  getCategories: evlifeGetCategories,
  getActiveProducts: evlifeGetActiveProducts,
  getCheapestProducts: evlifeGetCheapestProducts,
  getProductsByCategory: evlifeGetProductsByCategory,

  matchSaleScript: evlifeMatchSaleScript,
  matchKnowledgeDoc: evlifeMatchKnowledgeDoc,

  matchAdminEscalation: evlifeMatchAdminEscalation,
  matchStockInquiry: evlifeMatchStockInquiry,
  matchVatRefund: evlifeMatchVatRefund,
  matchContactIntent: evlifeMatchContactIntent,
  matchDiscontinued: evlifeMatchDiscontinued,

  buildAdminEscalationResponse: evlifeBuildAdminEscalationResponse,
  buildStockCheckResponse: evlifeBuildStockCheckResponse,
  buildVatRefundResponse: evlifeBuildVatRefundResponse,
  buildContactChannelsResponse: evlifeBuildContactChannelsResponse,
  buildDiscontinuedResponse: evlifeBuildDiscontinuedResponse,

  systemPromptIdentity: `คุณคือ "น้องอีฟ" — ผู้ช่วย AI ของ EV Life Thailand ผู้เชี่ยวชาญแบตเตอรี่ LiFePO4 12V สำหรับรถยนต์ไฟฟ้า EV และตัวแทนจำหน่ายมอเตอร์ไซค์ไฟฟ้า EM อย่างเป็นทางการ

## บุคลิก (Persona)
- สุภาพ อ่อนน้อม และเป็นกันเอง เหมือนพนักงานขายมืออาชีพที่ใส่ใจลูกค้าจริงๆ
- ใช้คำลงท้าย "ครับ" สม่ำเสมอ — ไม่ห้วน ไม่แข็ง
- เวลาลูกค้าถามอะไร ให้ขอบคุณหรือรับรู้ความรู้สึกก่อนตอบ เช่น "ขอบคุณที่ถามครับ!" หรือ "เข้าใจเลยครับ!"
- ถ้าลูกค้ากังวล ให้ reassure ก่อน เช่น "ไม่ต้องกังวลเลยครับ" แล้วค่อยอธิบาย
- ถ้าตอบข้อมูลยาว ให้แบ่งเป็น bullet point อ่านง่าย ไม่ยัดทุกอย่างเป็นย่อหน้าเดียว
- จบทุกการตอบด้วยคำถามกลับ หรือชวนให้ลูกค้าถามต่อ เพื่อให้บทสนทนาต่อเนื่อง
- ห้ามตอบแบบหุ่นยนต์หรือกระชับเกินจนดูไม่ใส่ใจ
- ถ้าไม่มีข้อมูลในระบบ ให้บอกอย่างจริงใจและแนะนำให้ติดต่อทีมงาน อย่าเดาหรือแต่งข้อมูลขึ้นมา

## ภาษา
- ตอบภาษาไทยเป็นหลัก
- ถ้าลูกค้าถามภาษาอังกฤษ ให้ตอบภาษาอังกฤษในสไตล์เดียวกัน (friendly, polite, helpful)`,

  orderChannelsText: "- LINE: @evlifethailand (แนะนำ)\n- Facebook: EV Life Thailand\n- โทร: 094-905-6155\n- เว็บ: https://evlifethailand.co.th\n- หน้าร้าน: สาขาราชพฤกษ์ (Google Maps: https://maps.app.goo.gl/4zvmTZN843FrJTWr9)",

  defaultFallbackMessage:
    "ขอบคุณที่ติดต่อ **EV Life Thailand** ครับ!\n\nวันนี้สนใจเรื่องไหนครับ?\n1. แบตเตอรี่ 12V LiFePO4 สำหรับรถยนต์ไฟฟ้า (BYD, Tesla, MG ฯลฯ)\n2. มอเตอร์ไซค์ไฟฟ้า EM (Legend, Milano, Owen)\n\nพิมพ์ 1 หรือ 2 หรือถามได้เลยครับ!",

  categoryChecks: [
    { keys: ["แบตเตอรี่", "แบต", "battery", "lifepo4", "12v"], category: "แบตเตอรี่ EV", label: "แบตเตอรี่ LiFePO4" },
    { keys: ["มอเตอร์ไซค์", "มอไซค์", "motorcycle", "em"], category: "มอเตอร์ไซค์ไฟฟ้า EM", label: "มอเตอร์ไซค์ไฟฟ้า EM" },
    { keys: ["บริการ", "on-site", "ออนไซต์", "เปลี่ยนแบต"], category: "บริการ", label: "บริการ On-site" },
    { keys: ["อุปกรณ์", "เครื่องชาร์จ", "charger", "tester"], category: "อุปกรณ์เสริม", label: "อุปกรณ์เสริม" },
    { keys: ["ถูก", "ประหยัด", "งบน้อย", "budget", "cheap", "ราคาเริ่มต้น"], category: "Budget", label: "สินค้าราคาเริ่มต้น" },
  ],

  faqTerms: [
    // Motorcycle-specific topics MUST come BEFORE generic "ประกัน"/"warranty" to avoid battery FAQ hit
    { keys: ["ประกันมอเตอร์ไซค์", "ประกัน มอเตอร์ไซค์", "ประกัน em", "ประกัน legend", "ประกัน milan", "ประกัน owen", "warranty em", "warranty มอไซค์", "รับประกันมอไซค์", "รับประกัน มอไซค์", "รับประกัน em", "รับประกัน legend"], topic: "มอเตอร์ไซค์ไฟฟ้า" },
    { keys: ["จดทะเบียน", "ทะเบียน", "พรบ"], topic: "มอเตอร์ไซค์ไฟฟ้า" },
    { keys: ["เปรียบเทียบ", "ต่างกัน", "compare", "vs"], topic: "มอเตอร์ไซค์ไฟฟ้า" },
    { keys: ["สั่งซื้อ", "สั่ง", "order", "buy", "ซื้อยังไง"], topic: "การสั่งซื้อ" },
    { keys: ["ผ่อน", "installment", "ไฟแนนซ์", "finance", "ฟรีดาวน์", "0%", "บัตรเครดิต", "ชำระ", "payment method", "ออกรถ", "ทำสัญญา", "สัญญาถึงบ้าน", "อาชีพอิสระ", "สลิปเงินเดือน", "statement", "สเตจเมนท์"], topic: "การชำระเงิน" },
    { keys: ["คืนสินค้า", "return", "refund", "นโยบายคืน"], topic: "การคืนสินค้า" },
    { keys: ["ประกัน", "warranty", "รับประกัน", "เคลม"], topic: "การรับประกัน" },
    { keys: ["on-site", "ออนไซต์", "ถึงบ้าน", "เปลี่ยนถึง", "ส่งถึงบ้าน", "จัดส่งถึงบ้าน"], topic: "บริการ On-site" },
    { keys: ["โปร", "ส่วนลด", "discount", "promotion", "coupon"], topic: "โปรโมชั่น" },
  ],
};

/* ------------------------------------------------------------------ */
/*  DJI 13 Service Plus config                                        */
/* ------------------------------------------------------------------ */

const dji13serviceConfig: BusinessConfig = {
  id: "dji13service",
  name: "DJI 13 Service Plus",
  shortName: "13 Service",
  description: "ศูนย์ซ่อม เคลม DJI Care Refresh และบริการโดรน DJI",
  primaryColor: "#ef4444",

  features: {
    visionEnabled: true,
    visionMaxMB: 10,
    videoReplyEnabled: true,
  },

  products: svcProducts,
  faqData: svcFaqData,
  saleScripts: svcSaleScripts,
  knowledgeDocs: svcKnowledgeDocs,
  intents: svcIntents,
  channels: svcChannels,
  analyticsData: svcAnalyticsData,

  searchProducts: svcSearchProducts,
  getCategories: svcGetCategories,
  getActiveProducts: svcGetActiveProducts,
  getCheapestProducts: svcGetCheapestProducts,
  getProductsByCategory: svcGetProductsByCategory,

  matchSaleScript: svcMatchSaleScript,
  matchKnowledgeDoc: svcMatchKnowledgeDoc,

  matchAdminEscalation: svcMatchAdminEscalation,
  matchStockInquiry: svcMatchStockInquiry,
  matchVatRefund: svcMatchVatRefund,
  matchContactIntent: svcMatchContactIntent,
  matchDiscontinued: svcMatchDiscontinued,

  buildAdminEscalationResponse: svcBuildAdminEscalationResponse,
  buildStockCheckResponse: svcBuildStockCheckResponse,
  buildVatRefundResponse: svcBuildVatRefundResponse,
  buildContactChannelsResponse: svcBuildContactChannelsResponse,
  buildDiscontinuedResponse: svcBuildDiscontinuedResponse,

  systemPromptIdentity: `คุณคือ "น้องซ่อม" — ผู้ช่วย AI ของ DJI 13 Service Plus ศูนย์ซ่อมและบริการโดรน DJI ครบวงจร
คุณมีความเชี่ยวชาญเทียบเท่าช่างระดับ Senior ที่รู้จักโดรน DJI ทุกรุ่นอย่างละเอียด ทั้งด้านกลไก ไฟฟ้า และซอฟต์แวร์

## บุคลิก (Persona)
- สุภาพ เป็นมืออาชีพ และให้ความมั่นใจกับลูกค้าที่กังวลเรื่องโดรนเสีย
- ใช้คำลงท้าย "ครับ" สม่ำเสมอ — ไม่ห้วน ไม่แข็ง
- เมื่อลูกค้าแจ้งปัญหา ให้รับรู้ความกังวลก่อน เช่น "เข้าใจเลยครับ ไม่ต้องกังวลนะครับ"
- ตอบได้ทั้ง 2 ระดับ:
  * **ลูกค้าทั่วไป**: อธิบายง่าย บอกขั้นตอน บอกราคาโดยประมาณ ชวนส่งมาประเมินฟรี
  * **ช่างเทคนิค**: ลงรายละเอียด error code, diagnostic procedure, component-level analysis
- ถ้าตอบข้อมูลยาว ให้แบ่งเป็น bullet point อ่านง่าย
- จบทุกการตอบด้วยการถามต่อหรือชวนให้ส่งรูป/ข้อมูลเพิ่ม
- ถ้าไม่แน่ใจ ให้บอกตรงๆ และแนะนำให้ส่งมาให้ช่างตรวจ อย่าเดาแบบมั่นใจเกินไป

## ภาษา
- ตอบภาษาไทยเป็นหลัก
- ถ้าลูกค้าถามภาษาอังกฤษ ให้ตอบภาษาอังกฤษในสไตล์เดียวกัน (friendly, technical, professional)`,

  orderChannelsText: "- LINE: @dji13service (แนะนำ)\n- Facebook: DJI 13 Store\n- โทร: 065-694-6155",

  defaultFallbackMessage:
    "ขอบคุณที่ติดต่อ **DJI 13 Service Plus** ครับ!\n\nผมช่วยได้เรื่องเหล่านี้ครับ:\n- ส่งซ่อมโดรน DJI ทุกรุ่น\n- เคลม DJI Care Refresh\n- กรณี Flyaway / เปียกน้ำ\n- ปัญหากิมบอล / แบตเตอรี่ / สัญญาณ\n- Error code & คู่มือช่างวินิจฉัย\n- ราคาซ่อมและอะไหล่\n\nลองพิมพ์ปัญหา เช่น 'กิมบอลสั่น' หรือ 'error code 40008' ได้เลยครับ!",

  categoryChecks: [
    { keys: ["ซ่อม", "repair", "เสีย", "พัง"], category: "ซ่อม", label: "บริการซ่อม" },
    { keys: ["เคลม", "care refresh", "dji care", "claim"], category: "DJI Care Refresh", label: "DJI Care Refresh" },
    { keys: ["อะไหล่", "spare", "parts", "ชิ้นส่วน"], category: "อะไหล่", label: "อะไหล่/ชิ้นส่วน" },
    { keys: ["flyaway", "บินหาย", "หายไป", "crash", "ตก"], category: "เหตุฉุกเฉิน", label: "เหตุฉุกเฉิน" },
    { keys: ["error", "code", "ข้อผิดพลาด", "error code"], category: "Error Code", label: "รหัส Error" },
    { keys: ["ช่าง", "technician", "วินิจฉัย", "diagnostic"], category: "ช่างเทคนิค", label: "คู่มือช่าง" },
  ],

  faqTerms: [
    { keys: ["ราคาซ่อม", "ค่าซ่อม", "repair cost", "ค่าบริการ"], topic: "ราคาซ่อม" },
    { keys: ["care refresh", "dji care", "เคลม", "claim"], topic: "DJI Care Refresh" },
    { keys: ["ส่ง", "จัดส่ง", "shipping", "delivery", "ส่งซ่อม"], topic: "การส่งซ่อม" },
    { keys: ["ประกัน", "warranty", "รับประกัน"], topic: "รับประกัน" },
    { keys: ["flyaway", "บินหาย", "crash", "ตก", "เปียกน้ำ", "water"], topic: "เหตุฉุกเฉิน" },
    { keys: ["error", "code", "ข้อผิดพลาด"], topic: "Error Code" },
    { keys: ["ช่าง", "technician", "diagnostic", "วินิจฉัย", "checklist"], topic: "คู่มือช่าง" },
    { keys: ["firmware", "อัปเดต", "update", "dji fly", "dji assistant"], topic: "Firmware" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Registry                                                          */
/* ------------------------------------------------------------------ */

export const businessUnits: Record<string, BusinessConfig> = {
  dji13store: djiConfig,
  evlifethailand: evlifeConfig,
  dji13service: dji13serviceConfig,
};

export const businessUnitList = [
  { id: "dji13store", name: "DJI 13 STORE", shortName: "DJI 13", description: "ตัวแทนจำหน่าย DJI อย่างเป็นทางการ", primaryColor: "#3b82f6", icon: "drone" },
  { id: "evlifethailand", name: "EV Life Thailand", shortName: "EV Life", description: "แบตเตอรี่ LiFePO4 & มอเตอร์ไซค์ไฟฟ้า EM", primaryColor: "#f97316", icon: "battery" },
  { id: "dji13service", name: "DJI 13 Service Plus", shortName: "13 Service", description: "ศูนย์ซ่อม เคลม DJI Care Refresh และบริการโดรน DJI", primaryColor: "#ef4444", icon: "wrench" },
] as const;

export const DEFAULT_BUSINESS_ID = "dji13store";

export function getBusinessConfig(businessId: string): BusinessConfig {
  return businessUnits[businessId] || businessUnits[DEFAULT_BUSINESS_ID];
}
