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

// Channels data
import { channels as djiChannels, type ChannelInfo } from "@/lib/channels";
import { channels as evlifeChannels } from "@/lib/evlife/channels";

// Analytics data
import { analyticsData as djiAnalyticsData, type AnalyticsData } from "@/lib/analytics";
import { analyticsData as evlifeAnalyticsData } from "@/lib/evlife/analytics";

/* ------------------------------------------------------------------ */
/*  BusinessConfig — everything the pipeline needs for one business   */
/* ------------------------------------------------------------------ */

export interface BusinessConfig {
  id: string;
  name: string;
  shortName: string;
  description: string;
  primaryColor: string;
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

  systemPromptIdentity: `คุณคือ "EV Life Thailand Assistant" ผู้ช่วย AI ของ EV Life Thailand ผู้เชี่ยวชาญแบตเตอรี่ LiFePO4 12V สำหรับรถยนต์ไฟฟ้า EV และตัวแทนจำหน่ายมอเตอร์ไซค์ไฟฟ้า EM อย่างเป็นทางการ บน DroidMind
ตอบภาษาไทยเป็นหลัก ตอบภาษาอังกฤษได้ถ้าลูกค้าถามเป็นภาษาอังกฤษ`,

  orderChannelsText: "- LINE: @evlifethailand (แนะนำ)\n- Facebook: EV Life Thailand\n- โทร: 094-905-6155\n- เว็บ: https://evlifethailand.co.th\n- หน้าร้าน: สาขาราชพฤกษ์ (Google Maps: https://maps.app.goo.gl/4zvmTZN843FrJTWr9)",

  defaultFallbackMessage:
    "ขอบคุณที่ติดต่อ **EV Life Thailand** ครับ!\n\nผมช่วยได้เรื่องเหล่านี้ครับ:\n- แบตเตอรี่ 12V LiFePO4 สำหรับรถ EV\n- มอเตอร์ไซค์ไฟฟ้า EM\n- บริการ On-site ถึงบ้าน\n- ราคาและโปรโมชั่น\n- รับประกัน 4 ปี\n\nลองพิมพ์รุ่นรถ เช่น 'BYD Atto 3' หรือ 'EM Milano' ได้เลยครับ!",

  categoryChecks: [
    { keys: ["แบตเตอรี่", "แบต", "battery", "lifepo4", "12v"], category: "แบตเตอรี่ EV", label: "แบตเตอรี่ LiFePO4" },
    { keys: ["มอเตอร์ไซค์", "มอไซค์", "motorcycle", "em"], category: "มอเตอร์ไซค์ไฟฟ้า EM", label: "มอเตอร์ไซค์ไฟฟ้า EM" },
    { keys: ["บริการ", "on-site", "ออนไซต์", "เปลี่ยนแบต"], category: "บริการ", label: "บริการ On-site" },
    { keys: ["อุปกรณ์", "เครื่องชาร์จ", "charger", "tester"], category: "อุปกรณ์เสริม", label: "อุปกรณ์เสริม" },
    { keys: ["ถูก", "ประหยัด", "งบน้อย", "budget", "cheap", "ราคาเริ่มต้น"], category: "Budget", label: "สินค้าราคาเริ่มต้น" },
  ],

  faqTerms: [
    { keys: ["สั่งซื้อ", "สั่ง", "order", "buy", "ซื้อยังไง"], topic: "การสั่งซื้อ" },
    { keys: ["ผ่อน", "installment", "บัตรเครดิต", "0%", "ชำระ", "payment"], topic: "การชำระเงิน" },
    { keys: ["คืน", "เปลี่ยน", "return", "refund"], topic: "การคืนสินค้า" },
    { keys: ["ประกัน", "warranty", "เคลม"], topic: "การรับประกัน" },
    { keys: ["on-site", "ออนไซต์", "ถึงบ้าน", "เปลี่ยนถึง"], topic: "บริการ On-site" },
    { keys: ["โปร", "ส่วนลด", "discount", "promotion", "coupon"], topic: "โปรโมชั่น" },
    { keys: ["จดทะเบียน", "ทะเบียน", "พรบ"], topic: "มอเตอร์ไซค์ไฟฟ้า" },
    { keys: ["เปรียบเทียบ", "ต่างกัน", "compare", "vs"], topic: "มอเตอร์ไซค์ไฟฟ้า" },
  ],
};

/* ------------------------------------------------------------------ */
/*  Registry                                                          */
/* ------------------------------------------------------------------ */

export const businessUnits: Record<string, BusinessConfig> = {
  dji13store: djiConfig,
  evlifethailand: evlifeConfig,
};

export const businessUnitList = [
  { id: "dji13store", name: "DJI 13 STORE", shortName: "DJI 13", description: "ตัวแทนจำหน่าย DJI อย่างเป็นทางการ", primaryColor: "#3b82f6", icon: "drone" },
  { id: "evlifethailand", name: "EV Life Thailand", shortName: "EV Life", description: "แบตเตอรี่ LiFePO4 & มอเตอร์ไซค์ไฟฟ้า EM", primaryColor: "#f97316", icon: "battery" },
] as const;

export const DEFAULT_BUSINESS_ID = "dji13store";

export function getBusinessConfig(businessId: string): BusinessConfig {
  return businessUnits[businessId] || businessUnits[DEFAULT_BUSINESS_ID];
}
