import { getChannel } from "@/lib/evlife/channels";

export interface DiscontinuedMapping {
  triggers: string[];
  recommended: string;
  note?: string;
}

const ADMIN_ESCALATION_TRIGGERS = [
  "แอดมิน",
  "admin",
  "พนักงาน",
  "คนจริง",
  "เจ้าหน้าที่",
  "ตัวแทน",
  "representative",
  "human",
  "คุยกับคน",
];

const STOCK_TRIGGERS = [
  "มีของไหม",
  "มีของมั้ย",
  "ของมีไหม",
  "ของเหลือไหม",
  "เหลือไหม",
  "สต็อก",
  "stock",
  "availability",
  "available",
  "พร้อมส่งไหม",
  "พร้อมเปลี่ยนไหม",
  "มีแบตไหม",
];

const VAT_REFUND_TRIGGERS = [
  "vat refund",
  "tax refund",
  "refund vat",
  "คืน vat",
  "คืนภาษี",
  "นักท่องเที่ยว",
  "tourist",
];

const CONTACT_TRIGGERS = [
  "ติดต่อ",
  "ช่องทาง",
  "line",
  "ไลน์",
  "เบอร์",
  "โทร",
  "email",
  "อีเมล",
  "contact",
];

export const discontinuedMappings: DiscontinuedMapping[] = [];

export function includesAny(textLower: string, triggers: string[]) {
  return triggers.some((t) => textLower.includes(t.toLowerCase()));
}

export function matchAdminEscalation(message: string): boolean {
  return includesAny(message.toLowerCase(), ADMIN_ESCALATION_TRIGGERS);
}

export function matchStockInquiry(message: string): boolean {
  return includesAny(message.toLowerCase(), STOCK_TRIGGERS);
}

export function matchVatRefund(message: string): boolean {
  return includesAny(message.toLowerCase(), VAT_REFUND_TRIGGERS);
}

export function matchContactIntent(message: string): boolean {
  return includesAny(message.toLowerCase(), CONTACT_TRIGGERS);
}

export function matchDiscontinued(message: string): DiscontinuedMapping | undefined {
  const lower = message.toLowerCase();
  return discontinuedMappings.find((m) => includesAny(lower, m.triggers));
}

export function buildAdminEscalationResponse(): string {
  return "ได้เลยครับ! ผมจะโอนการสนทนาให้ทีมงานดูแลต่อทันทีครับ\nทีมงานจะติดต่อกลับโดยเร็วที่สุดครับ\n\nติดต่อด่วน: LINE @evlifethailand";
}

export function buildStockCheckResponse(): string {
  return "ผมขออนุญาตตรวจสอบกับทีมงานให้แน่ชัดก่อนนะครับ เพื่อข้อมูลที่ถูกต้อง 100% ครับ ระหว่างนี้ ให้ผมช่วยแนะนำข้อมูลส่วนอื่นก่อนไหมครับ?";
}

export function buildVatRefundResponse(): string {
  return "ขออภัยครับ ทาง EV Life Thailand **ไม่มีบริการ VAT Refund สำหรับนักท่องเที่ยว** ครับ เป็นการจำหน่ายภายในประเทศไทยเท่านั้นครับ";
}

export function buildContactChannelsResponse(): string {
  const fb = getChannel("FACEBOOK");
  const line = getChannel("LINE");
  const web = getChannel("WEB_EMBED");

  const fbLine = fb?.facebook?.pageUrl
    ? `\n\nFacebook Page\n- ${fb.facebook.pageUrl}`
    : "";
  const lineLine = line?.line?.channelId
    ? `\n\nLINE OA (Channel ID)\n- ${line.line.channelId}`
    : "";
  const webLine = web?.web?.demoSitePath
    ? `\n\nWeb Embed\n- Demo: ${web.web.demoSitePath}\n- Script Key: ${web.web.scriptKey || "-"}`
    : "";

  return (
    "ได้เลยครับ ผมขอแชร์ช่องทางติดต่ออย่างเป็นทางการของ EV Life Thailand ครับ\n\n" +
    "แบตเตอรี่ EV & บริการ On-site\n" +
    "- LINE: @evlifethailand\n" +
    "- โทร: 09x-xxx-xxxx\n" +
    "- เว็บไซต์: https://evlifethailand.co.th\n\n" +
    "มอเตอร์ไซค์ไฟฟ้า EM\n" +
    "- LINE: @evlifethailand\n" +
    "- Facebook: EV Life Thailand" +
    fbLine +
    lineLine +
    webLine
  );
}

export function buildDiscontinuedResponse(mapping: DiscontinuedMapping): string {
  return (
    `ขออภัยครับ รุ่นที่สอบถาม **ยกเลิกการจำหน่าย/ไม่อยู่ในไลน์สินค้าแล้ว** ครับ\n` +
    `ผมแนะนำรุ่นใหม่ในซีรีส์เดียวกันคือ **${mapping.recommended}** แทนครับ` +
    (mapping.note ? `\n\nหมายเหตุ: ${mapping.note}` : "")
  );
}

// ============================================================
// Intent Interface & Full Intent Policies
// ============================================================

export interface Intent {
  id: string;
  number: number;
  name: string;
  description: string;
  triggers: string[];
  policy: string;
  responseTemplate: string;
  active: boolean;
}

export const intents: Intent[] = [
  {
    id: "greeting",
    number: 1,
    name: "Greeting",
    description: "ลูกค้าทักทายหรือเริ่มต้นการสนทนา",
    triggers: ["สวัสดี", "หวัดดี", "ดีครับ", "ดีค่ะ", "hello", "hi", "hey", "good morning", "good afternoon", "อรุณสวัสดิ์"],
    policy: "ตอบทักทายกลับอย่างเป็นมิตร แนะนำตัวเองเป็น EV Life Thailand Assistant และถามว่าต้องการความช่วยเหลืออะไร",
    responseTemplate: "สวัสดีครับ! ยินดีต้อนรับสู่ **EV Life Thailand** ผู้เชี่ยวชาญแบตเตอรี่ LiFePO4 สำหรับรถ EV และตัวแทนจำหน่ายมอเตอร์ไซค์ไฟฟ้า EM ครับ\n\nผมช่วยอะไรได้บ้างครับ?\n- แบตเตอรี่ 12V LiFePO4 สำหรับรถ EV\n- มอเตอร์ไซค์ไฟฟ้า EM\n- บริการ On-site ถึงบ้าน\n- สอบถามราคา/โปรโมชั่น\n- รับประกัน 4 ปี",
    active: true,
  },
  {
    id: "product_inquiry",
    number: 2,
    name: "Product Inquiry",
    description: "ลูกค้าสอบถามเกี่ยวกับสินค้าทั่วไป หรือต้องการดูรายการสินค้า",
    triggers: ["สินค้า", "มีอะไรบ้าง", "ขายอะไร", "product", "รายการ", "หมวด", "ประเภท", "category"],
    policy: "แสดงหมวดหมู่สินค้าที่มีจำหน่าย พร้อมจำนวนสินค้าในแต่ละหมวด ห้ามยืนยันสต็อก",
    responseTemplate: "EV Life Thailand มีสินค้าและบริการหลากหลายครับ:\n\n**แบตเตอรี่ EV** - แบตเตอรี่ LiFePO4 12V สำหรับรถ EV ทุกรุ่น\n**มอเตอร์ไซค์ไฟฟ้า EM** - ตัวแทนจำหน่ายอย่างเป็นทางการ\n**บริการ On-site** - เปลี่ยนแบตเตอรี่ถึงบ้าน\n**อุปกรณ์เสริม** - เครื่องชาร์จ สายชาร์จ EV อื่นๆ\n\nสนใจหมวดไหนครับ?",
    active: true,
  },
  {
    id: "product_details",
    number: 3,
    name: "Product Details",
    description: "ลูกค้าสอบถามรายละเอียดสินค้าเฉพาะรุ่น เช่น สเปค ราคา ฟีเจอร์",
    triggers: ["สเปค", "spec", "รายละเอียด", "detail", "ฟีเจอร์", "feature", "ความสามารถ", "วิ่งได้กี่กิโล", "ความเร็ว", "กำลังมอเตอร์"],
    policy: "ให้ข้อมูลสเปคจากฐานข้อมูลสินค้าเท่านั้น ห้ามเดาหรือประมาณสเปค ห้ามยืนยันสต็อก",
    responseTemplate: "ขอให้ข้อมูลสินค้าที่ต้องการครับ\n\nหากต้องการข้อมูลเพิ่มเติม ผมขออนุญาตตรวจสอบกับทีมงานให้แน่ชัดก่อนนะครับ",
    active: true,
  },
  {
    id: "recommendation",
    number: 4,
    name: "Recommendation Request",
    description: "ลูกค้าขอให้แนะนำสินค้าที่เหมาะสม",
    triggers: ["แนะนำ", "recommend", "ควรซื้อ", "รุ่นไหนดี", "เลือกอะไรดี", "ตัวไหนดี", "เหมาะกับ", "suitable", "best for", "ใช้งานแบบ"],
    policy: "ถามความต้องการและงบประมาณก่อน จากนั้นแนะนำสินค้าที่เหมาะสมจากฐานข้อมูล",
    responseTemplate: "ยินดีช่วยแนะนำครับ!\n\nเพื่อให้แนะนำได้ตรงใจ ขอทราบข้อมูลเพิ่มเติมครับ:\n1. **รุ่นรถ EV** ที่ใช้อยู่ (กรณีแบตเตอรี่)\n2. **การใช้งาน** - ในเมือง/ทางไกล (กรณีมอเตอร์ไซค์ EM)\n3. **งบประมาณ** - ประมาณเท่าไหร่ครับ?",
    active: true,
  },
  {
    id: "support_inquiry",
    number: 5,
    name: "Support Inquiry",
    description: "ลูกค้าสอบถามเรื่องการซ่อม การเคลม หรือปัญหาทางเทคนิค",
    triggers: ["ซ่อม", "repair", "เคลม", "claim", "เสีย", "broken", "ปัญหา", "problem", "issue", "ไม่ทำงาน", "not working", "บริการหลังการขาย"],
    policy: "แนะนำให้ติดต่อทีม Support โดยตรง ห้ามรับปากว่าจะซ่อมหรือเคลมได้",
    responseTemplate: "สำหรับการซ่อม/เคลมสินค้า กรุณาติดต่อทีมงานโดยตรงครับ\n\n**EV Life Thailand Support**\n- LINE: @evlifethailand\n- โทร: 09x-xxx-xxxx\n- เว็บ: https://evlifethailand.co.th\n\nทีมงานจะช่วยดูแลให้ครับ",
    active: true,
  },
  {
    id: "unclear_intent",
    number: 6,
    name: "Other (Unclear Intent)",
    description: "ข้อความที่ไม่ชัดเจนหรือไม่ตรงกับ intent ใดๆ",
    triggers: [],
    policy: "ตอบอย่างสุภาพว่าไม่เข้าใจ และแนะนำว่าสามารถช่วยเรื่องอะไรได้บ้าง",
    responseTemplate: "ขอบคุณที่ติดต่อ **EV Life Thailand** ครับ!\n\nผมช่วยได้เรื่องเหล่านี้ครับ:\n- แบตเตอรี่ 12V LiFePO4 สำหรับรถ EV\n- มอเตอร์ไซค์ไฟฟ้า EM\n- บริการ On-site ถึงบ้าน\n- ราคาและโปรโมชั่น\n- รับประกัน/เคลม\n\nลองพิมพ์รุ่นรถ เช่น 'BYD Atto 3' หรือ 'EM Milano' ได้เลยครับ!",
    active: true,
  },
  {
    id: "on_site_service",
    number: 7,
    name: "On-site Service Inquiry",
    description: "ลูกค้าสอบถามเกี่ยวกับบริการ On-site เปลี่ยนแบตเตอรี่ถึงบ้าน",
    triggers: ["on-site", "ออนไซต์", "ถึงบ้าน", "เปลี่ยนถึงที่", "มาเปลี่ยนให้", "บริการถึงบ้าน", "เดินทาง", "ค่าเดินทาง"],
    policy: "ให้ข้อมูลบริการ On-site ที่ถูกต้อง รวมพื้นที่ให้บริการ ค่าบริการ และขั้นตอน",
    responseTemplate: "EV Life Thailand มีบริการ On-site เปลี่ยนแบตเตอรี่ถึงบ้านครับ\n\n**กรุงเทพฯ-ปริมณฑล**: ฟรีค่าเดินทาง\n**ต่างจังหวัด**: มีค่าบริการเพิ่มเติม\n**ใช้เวลา**: 30-60 นาที\n**นัดหมาย**: ล่วงหน้า 1-2 วัน\n\nสนใจนัดหมายเลยไหมครับ? ติดต่อ LINE: @evlifethailand",
    active: true,
  },
  {
    id: "contact_channels",
    number: 8,
    name: "Contact Channels",
    description: "ลูกค้าสอบถามช่องทางติดต่อร้าน",
    triggers: ["ติดต่อ", "contact", "line", "ไลน์", "เบอร์โทร", "โทรศัพท์", "phone", "email", "อีเมล", "ช่องทาง", "facebook"],
    policy: "ให้ข้อมูลช่องทางติดต่ออย่างเป็นทางการเท่านั้น",
    responseTemplate: "ช่องทางติดต่ออย่างเป็นทางการของ EV Life Thailand ครับ\n\n**LINE OA**: @evlifethailand\n**Facebook**: EV Life Thailand\n**เว็บไซต์**: https://evlifethailand.co.th\n**โทร**: 09x-xxx-xxxx\n**เวลาทำการ**: จันทร์-เสาร์ 9:00-18:00 น.",
    active: true,
  },
  {
    id: "warranty_info",
    number: 9,
    name: "Warranty Information",
    description: "ลูกค้าสอบถามเรื่องการรับประกัน",
    triggers: ["รับประกัน", "warranty", "ประกัน", "guarantee", "เคลม", "claim", "ประกัน 4 ปี", "ประกันกี่ปี"],
    policy: "ให้ข้อมูลการรับประกันที่ถูกต้อง ห้ามรับปากเกินเงื่อนไข",
    responseTemplate: "การรับประกันจาก EV Life Thailand ครับ\n\n**แบตเตอรี่ LiFePO4 12V**\n- รับประกัน 4 ปี\n- ครอบคลุมแบตเสื่อมก่อนเวลา/ชำรุดจากการผลิต\n\n**มอเตอร์ไซค์ EM**\n- มอเตอร์: 3 ปี\n- แบตเตอรี่หลัก: 3 ปี / 30,000 กม.\n- เฟรม: 5 ปี\n\nเคลมง่าย ติดต่อ LINE: @evlifethailand ครับ",
    active: true,
  },
  {
    id: "battery_symptom",
    number: 10,
    name: "Battery Symptom Check",
    description: "ลูกค้าสอบถามอาการแบตเตอรี่เสื่อมในรถ EV",
    triggers: ["อาการ", "เปิดไม่ติด", "ระบบค้าง", "หน้าจอดับ", "12v low", "แบตหมด", "ประตูเปิดไม่ได้", "ไฟเตือน", "สตาร์ทไม่ติด"],
    policy: "ให้ข้อมูลอาการแบตเสื่อมที่ถูกต้อง แนะนำให้เปลี่ยนเป็น LiFePO4",
    responseTemplate: "อาการที่บ่งบอกว่าแบตเตอรี่ 12V ในรถ EV เสื่อมครับ\n\n- เปิดรถไม่ติด / สตาร์ทระบบไม่ขึ้น\n- หน้าจอดับ / ระบบค้าง\n- ไฟเตือน '12V Battery Low'\n- ประตูเปิด/ปิดไม่ได้\n- กระจกไฟฟ้าทำงานช้า\n\nแนะนำเปลี่ยนเป็น LiFePO4 รับประกัน 4 ปี ใช้งานยาวนานกว่าแบตเดิม 4-5 เท่าครับ!",
    active: true,
  },
  {
    id: "ev_purchase",
    number: 11,
    name: "Purchase Conversation",
    description: "ลูกค้าต้องการซื้อสินค้าหรือสอบถามขั้นตอนการซื้อ",
    triggers: ["ซื้อ", "buy", "purchase", "order", "สั่งซื้อ", "จะซื้อ", "อยากได้", "ราคาเท่าไหร่", "ราคา", "price", "เท่าไหร่", "กี่บาท"],
    policy: "ให้ข้อมูลราคาจากฐานข้อมูลสินค้าเท่านั้น ห้ามประมาณราคา ห้ามยืนยันสต็อก แนะนำช่องทางสั่งซื้อ",
    responseTemplate: "ยินดีช่วยเรื่องการสั่งซื้อครับ!\n\n**ช่องทางสั่งซื้อ**\n- LINE: @evlifethailand\n- Facebook: EV Life Thailand\n- เว็บ: https://evlifethailand.co.th\n\nสนใจสินค้ารุ่นไหนครับ? ผมจะแจ้งราคาและรายละเอียดให้ครับ",
    active: true,
  },
  {
    id: "em_motorcycle",
    number: 12,
    name: "EM Motorcycle Inquiry",
    description: "ลูกค้าสอบถามเกี่ยวกับมอเตอร์ไซค์ไฟฟ้า EM โดยเฉพาะ",
    triggers: ["มอเตอร์ไซค์", "มอไซค์", "motorcycle", "em", "milano", "legend", "owen", "enzo", "qarez", "จักรยานยนต์ไฟฟ้า"],
    policy: "แนะนำมอเตอร์ไซค์ EM ตามความต้องการ ให้ข้อมูลจากฐานข้อมูลเท่านั้น",
    responseTemplate: "EV Life Thailand เป็นตัวแทนจำหน่ายมอเตอร์ไซค์ไฟฟ้า EM อย่างเป็นทางการครับ\n\n**รุ่นที่มีจำหน่าย**\n- EM Qarez — 69,000 บาท\n- EM Legend — 99,000 บาท\n- EM Milano — 109,000 บาท\n- EM Owen Long Range — 125,000 บาท\n- EM Legend Pro — 139,000 บาท\n- EM Enzo — 159,000 บาท\n\nทุกรุ่นจดทะเบียนได้! สนใจรุ่นไหนครับ?",
    active: true,
  },
  {
    id: "deposit_policy",
    number: 13,
    name: "Deposit Policy",
    description: "ลูกค้าสอบถามเรื่องการวางมัดจำหรือการจอง",
    triggers: ["มัดจำ", "deposit", "จอง", "reserve", "booking", "วางเงิน", "จ่ายก่อน", "pre-order"],
    policy: "แนะนำให้ติดต่อทีมงานโดยตรง ห้ามส่ง payment link",
    responseTemplate: "สำหรับการวางมัดจำ/จองสินค้า กรุณาติดต่อทีมงานโดยตรงครับ\n\n**หมายเหตุสำคัญ**: ร้านไม่มีการส่ง payment link ทาง chat การชำระเงินต้องผ่านช่องทางอย่างเป็นทางการเท่านั้น\n\nLINE: @evlifethailand",
    active: true,
  },
  {
    id: "admin_escalation",
    number: 14,
    name: "Admin Escalation / Shutdown",
    description: "ลูกค้าต้องการคุยกับแอดมินหรือพนักงานจริง",
    triggers: ["แอดมิน", "admin", "พนักงาน", "คนจริง", "เจ้าหน้าที่", "ตัวแทน", "representative", "human", "คุยกับคน", "ขอคุยกับ", "โอนสาย"],
    policy: "หยุดตอบทันที ส่งข้อความโอนให้ทีมงาน",
    responseTemplate: "ได้เลยครับ! ผมจะโอนการสนทนาให้ทีมงานดูแลต่อทันทีครับ\n\nทีมงานจะติดต่อกลับโดยเร็วที่สุดครับ\n\nติดต่อด่วน: LINE @evlifethailand",
    active: true,
  },
  {
    id: "budget_recommendation",
    number: 15,
    name: "Price Recommendation by Budget Range",
    description: "ลูกค้าบอกงบประมาณและต้องการคำแนะนำสินค้า",
    triggers: ["งบ", "budget", "ราคาไม่เกิน", "ไม่เกิน", "within budget", "ประมาณ", "แถวๆ", "หมื่น", "สองหมื่น", "สามหมื่น", "ห้าหมื่น", "แสน"],
    policy: "แนะนำสินค้าที่อยู่ในงบประมาณจากฐานข้อมูลเท่านั้น",
    responseTemplate: "ขอบคุณที่แจ้งงบประมาณครับ!\n\nผมจะแนะนำสินค้าที่เหมาะกับงบของคุณจากฐานข้อมูลของเราครับ\n\nราคาที่แสดงเป็นราคา ณ ปัจจุบัน อาจมีการเปลี่ยนแปลง กรุณายืนยันราคาอีกครั้งกับทีมงานครับ",
    active: true,
  },
  {
    id: "offtopic_playful",
    number: 16,
    name: "Off-topic Playful",
    description: "ลูกค้าพูดเรื่องนอกเหนือจากสินค้า",
    triggers: ["ชอบ", "สนุก", "เล่น", "ตลก", "joke", "fun", "เพลง", "หนัง", "กีฬา", "อาหาร", "weather", "อากาศ", "ดูดวง"],
    policy: "ตอบอย่างเป็นมิตรและสั้นๆ จากนั้นนำกลับมาสู่การช่วยเรื่องสินค้า",
    responseTemplate: "ขอบคุณที่คุยด้วยครับ แต่ผมเชี่ยวชาญเรื่องแบตเตอรี่ EV และมอเตอร์ไซค์ไฟฟ้า EM เป็นพิเศษครับ!\n\nมีอะไรให้ช่วยเรื่องแบตเตอรี่รถ EV หรือมอเตอร์ไซค์ไฟฟ้าไหมครับ?",
    active: true,
  },
  {
    id: "offtopic_sensitive",
    number: 17,
    name: "Off-topic Sensitive",
    description: "ลูกค้าพูดเรื่องอ่อนไหว",
    triggers: ["การเมือง", "politics", "ศาสนา", "religion", "เหยียด", "racist", "ความรุนแรง", "violence", "อาวุธ", "weapon", "ยาเสพติด", "drug"],
    policy: "ปฏิเสธอย่างสุภาพ นำกลับมาสู่การช่วยเรื่องสินค้า",
    responseTemplate: "ขออภัยครับ เรื่องนี้อยู่นอกเหนือขอบเขตที่ผมช่วยได้ครับ\n\nผมพร้อมช่วยเรื่องแบตเตอรี่ EV มอเตอร์ไซค์ไฟฟ้า EM และบริการของ EV Life Thailand ครับ",
    active: true,
  },
  {
    id: "promotion_inquiry",
    number: 18,
    name: "Promotion Inquiry",
    description: "ลูกค้าสอบถามเกี่ยวกับโปรโมชั่น ส่วนลด",
    triggers: ["โปรโมชั่น", "promotion", "ส่วนลด", "discount", "โค้ด", "code", "coupon", "คูปอง", "ลดราคา", "sale", "ของแถม"],
    policy: "ให้ข้อมูลโปรโมชั่นที่มีอยู่จริงเท่านั้น แนะนำให้ติดตาม LINE OA",
    responseTemplate: "สำหรับโปรโมชั่นล่าสุดของ EV Life Thailand ครับ\n\nOn-site ฟรีค่าเดินทาง (กรุงเทพฯ-ปริมณฑล)\nผ่อน 0% มอเตอร์ไซค์ EM (เงื่อนไขตามธนาคาร)\n\nติดตามโปรล่าสุด:\n- LINE: @evlifethailand\n- Facebook: EV Life Thailand",
    active: true,
  },
  {
    id: "installment_inquiry",
    number: 19,
    name: "Installment / Payment Inquiry",
    description: "ลูกค้าสอบถามเรื่องการผ่อนชำระหรือวิธีการชำระเงิน",
    triggers: ["ผ่อน", "installment", "ผ่อนได้ไหม", "ผ่อนชำระ", "บัตรเครดิต", "credit card", "0%", "ดอกเบี้ย", "interest", "งวด", "monthly", "ชำระ", "payment method"],
    policy: "ให้ข้อมูลวิธีการชำระเงินที่รองรับ ห้ามส่ง payment link",
    responseTemplate: "วิธีการชำระเงิน EV Life Thailand ครับ\n\n**แบตเตอรี่ 12V**\n- โอนเงิน / พร้อมเพย์\n- เงินสด (กรณี On-site)\n\n**มอเตอร์ไซค์ EM**\n- โอนเงิน / เงินสด\n- บัตรเครดิต\n- ผ่อน 0% (เงื่อนไขตามธนาคาร)\n\nร้านไม่มีการส่ง payment link ทาง chat\n\nสอบถามเพิ่มเติม LINE: @evlifethailand ครับ",
    active: true,
  },
];

export function matchIntent(message: string): Intent | undefined {
  const lower = message.toLowerCase();
  return intents.find(
    (intent) =>
      intent.active &&
      intent.triggers.length > 0 &&
      intent.triggers.some((t) => lower.includes(t.toLowerCase()))
  );
}
