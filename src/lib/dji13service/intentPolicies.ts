/* ------------------------------------------------------------------ */
/*  ทีมเอกสาร DJI 13 Store — Intent Policies                          */
/*  เน้น: ขึ้นทะเบียนโดรน กสทช. / ขออนุญาต CAAT                      */
/* ------------------------------------------------------------------ */

export interface DiscontinuedMapping {
  triggers: string[];
  recommended: string;
  note?: string;
}

const ADMIN_ESCALATION_TRIGGERS = [
  "แอดมิน", "admin", "พนักงาน", "คนจริง", "เจ้าหน้าที่",
  "ตัวแทน", "representative", "human", "คุยกับคน",
];

const STOCK_TRIGGERS: string[] = []; // ไม่ใช้สำหรับ BU นี้

const CONTACT_TRIGGERS = [
  "ติดต่อ", "ช่องทาง", "line", "ไลน์", "เบอร์", "โทร", "contact",
];

export const discontinuedMappings: DiscontinuedMapping[] = [];

export function includesAny(textLower: string, triggers: string[]) {
  return triggers.some((t) => textLower.includes(t.toLowerCase()));
}

export function matchAdminEscalation(message: string): boolean {
  return includesAny(message.toLowerCase(), ADMIN_ESCALATION_TRIGGERS);
}

export function matchStockInquiry(_message: string): boolean {
  return false; // N/A for document BU
}

export function matchVatRefund(_message: string): boolean {
  return false; // N/A for document BU
}

export function matchContactIntent(message: string): boolean {
  return includesAny(message.toLowerCase(), CONTACT_TRIGGERS);
}

export function matchDiscontinued(_message: string): DiscontinuedMapping | undefined {
  return undefined;
}

export function buildAdminEscalationResponse(): string {
  return "ได้เลยครับ! กำลังส่งให้ทีมงานดูแลต่อทันทีครับ\n\nติดต่อด่วน:\n- LINE: @dji13service\n- โทร: 065-694-6155";
}

export function buildStockCheckResponse(): string {
  return "ขออภัยครับ บริการนี้ไม่มีสินค้าในสต็อกครับ";
}

export function buildVatRefundResponse(): string {
  return "ขออภัยครับ บริการนี้ไม่มี VAT Refund ครับ";
}

export function buildContactChannelsResponse(): string {
  return (
    "ช่องทางติดต่อ ทีมเอกสาร DJI 13 Store ครับ\n\n" +
    "LINE: @dji13service\n" +
    "Facebook: DJI 13 Store\n" +
    "โทร: 065-694-6155\n" +
    "เวลาทำการ: จันทร์-ศุกร์ 9:00-17:00 น."
  );
}

export function buildDiscontinuedResponse(_mapping: DiscontinuedMapping): string {
  return "ขออภัยครับ บริการนี้ไม่มีในระบบแล้วครับ";
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
    description: "ทักทายหรือเริ่มต้นการสนทนา",
    triggers: ["สวัสดี", "หวัดดี", "ดีครับ", "hello", "hi", "hey"],
    policy: "ทักทายกลับ แนะนำบริการเอกสารโดรน กสทช./CAAT",
    responseTemplate:
      "สวัสดีครับ! ยินดีต้อนรับสู่ **ทีมเอกสาร DJI 13 Store** ครับ\n\nผมช่วยได้เรื่องเหล่านี้ครับ:\n- ขึ้นทะเบียนโดรนกับ **กสทช.**\n- ขออนุญาตบินเชิงพาณิชย์ **CAAT**\n- จัดทำเอกสารประกอบการขอใบอนุญาต\n- ต่ออายุทะเบียนโดรน\n- ปรึกษากฎหมายการบินโดรนในไทย\n\nมีอะไรให้ช่วยครับ?",
    active: true,
  },
  {
    id: "ncat_registration",
    number: 2,
    name: "กสทช. Drone Registration",
    description: "ขึ้นทะเบียนโดรนกับ กสทช. (สำนักงานคณะกรรมการกิจการกระจายเสียง กิจการโทรทัศน์ และกิจการโทรคมนาคมแห่งชาติ)",
    triggers: [
      "ขึ้นทะเบียน", "ลงทะเบียนโดรน", "register โดรน", "กสทช", "nbtc",
      "ทะเบียนโดรน", "จดทะเบียน", "ทะเบียน กสทช", "ขึ้นทะเบียน กสทช",
      "โดรนต้องลงทะเบียน", "ต้องขึ้นทะเบียน",
    ],
    policy: "อธิบายขั้นตอนการขึ้นทะเบียนโดรนกับ กสทช. และข้อกำหนดที่ต้องรู้",
    responseTemplate:
      "การขึ้นทะเบียนโดรนกับ **กสทช.** ครับ!\n\n**โดรนที่ต้องขึ้นทะเบียน:**\n- น้ำหนักตั้งแต่ **250 กรัมขึ้นไป**\n- ใช้ในพื้นที่ที่ไม่ใช่พื้นที่ส่วนตัว\n\n**เอกสารที่ต้องใช้:**\n1. สำเนาบัตรประชาชน\n2. Serial Number โดรน\n3. รูปถ่ายโดรน (ทุกด้าน)\n4. หลักฐานการซื้อ (ใบเสร็จ/Invoice)\n\n**ขั้นตอน:**\n1. ลงทะเบียนที่เว็บ drone.nbtc.go.th\n2. กรอกข้อมูลโดรนและเจ้าของ\n3. แนบเอกสารครบ\n4. รอการอนุมัติ 3-5 วันทำการ\n5. รับ QR Code ติดที่โดรน\n\n**ค่าธรรมเนียม:** ฟรี (ไม่มีค่าใช้จ่าย)\n\nต้องการให้ทีมช่วยจัดเตรียมเอกสารและดำเนินการแทนได้เลยครับ LINE: @dji13service",
    active: true,
  },
  {
    id: "caat_registration",
    number: 3,
    name: "CAAT Commercial Flight Permit",
    description: "ขออนุญาตบินโดรนเชิงพาณิชย์กับ กพท. (CAAT)",
    triggers: [
      "caat", "กพท", "บินพาณิชย์", "บินเชิงพาณิชย์", "ใบอนุญาตบิน",
      "อนุญาตบิน", "บินถ่ายภาพ", "บินรับจ้าง", "drone operator",
      "remote pilot license", "rpl", "นักบินโดรน", "ใบอนุญาตนักบิน",
    ],
    policy: "อธิบายขั้นตอนการขออนุญาต CAAT สำหรับการบินเชิงพาณิชย์",
    responseTemplate:
      "การขออนุญาตบินโดรนเชิงพาณิชย์กับ **กพท. (CAAT)** ครับ!\n\n**ใครต้องขออนุญาต CAAT:**\n- บินถ่ายภาพ/วิดีโอเพื่อรับเงิน\n- บินสำรวจ/แผนที่เพื่อการค้า\n- บินฉีดพ่นยา/เกษตร\n- ให้บริการ Drone Show\n\n**ประเภทใบอนุญาต:**\n- **RPL (Remote Pilot License)**: ใบขับขี่นักบินโดรน\n- **AOC (Air Operator Certificate)**: ใบอนุญาตผู้ประกอบการ\n\n**ขั้นตอนขอ RPL:**\n1. เรียนภาคทฤษฎี (ผ่าน CAAT LMS)\n2. สอบภาคทฤษฎี\n3. ฝึกบินภาคปฏิบัติกับ Flight Training Organization (FTO)\n4. สอบภาคปฏิบัติ\n5. ยื่นขอ RPL ที่ กพท.\n\n**ค่าใช้จ่ายโดยประมาณ:** 3,000–10,000 บาท (ขึ้นอยู่กับ FTO)\n\nทีมช่วยแนะนำและจัดเตรียมเอกสารได้ครับ LINE: @dji13service",
    active: true,
  },
  {
    id: "registration_docs",
    number: 4,
    name: "Registration Documents",
    description: "ถามเอกสารที่ต้องใช้ในการขึ้นทะเบียน",
    triggers: [
      "เอกสาร", "document", "ต้องใช้อะไร", "เตรียมอะไร", "ใช้อะไรบ้าง",
      "หลักฐาน", "แนบอะไร", "เอกสารที่ต้องใช้", "เอกสารขึ้นทะเบียน",
    ],
    policy: "ระบุเอกสารที่ต้องใช้ทั้งสำหรับ กสทช. และ CAAT",
    responseTemplate:
      "เอกสารที่ต้องใช้ครับ:\n\n**สำหรับขึ้นทะเบียน กสทช.:**\n1. สำเนาบัตรประชาชน\n2. Serial Number โดรน (ดูที่ตัวโดรนหรือกล่อง)\n3. รูปถ่ายโดรน 4 ด้าน (หน้า หลัง ซ้าย ขวา)\n4. ใบเสร็จหรือ Invoice การซื้อ\n\n**สำหรับขอใบอนุญาต CAAT (RPL):**\n1. สำเนาบัตรประชาชน\n2. รูปถ่ายหน้าตรง 1 นิ้ว (ไม่เกิน 6 เดือน)\n3. ใบรับรองแพทย์ (Class 2 หรือ Self-Declaration)\n4. Certificate จบหลักสูตรภาคทฤษฎี\n5. Log Book การฝึกบิน\n6. ผลสอบภาคปฏิบัติ\n\nต้องการให้ช่วยจัดเตรียมหรือตรวจสอบเอกสารก่อนยื่น LINE: @dji13service ครับ",
    active: true,
  },
  {
    id: "registration_status",
    number: 5,
    name: "Registration Status Check",
    description: "ตรวจสอบสถานะการขึ้นทะเบียนหรือขออนุญาต",
    triggers: [
      "สถานะ", "status", "คืบหน้า", "ตรวจสอบสถานะ", "อนุมัติหรือยัง",
      "เสร็จหรือยัง", "ผลการ", "ได้รับแล้วหรือยัง", "รอนานไหม",
    ],
    policy: "แนะนำช่องทางตรวจสอบสถานะและติดต่อทีมงาน",
    responseTemplate:
      "สำหรับตรวจสอบสถานะครับ:\n\n**กสทช. (ขึ้นทะเบียนโดรน):**\n- เว็บ drone.nbtc.go.th → Log in → ตรวจสอบสถานะ\n- โทร กสทช. 1200\n- ระยะเวลาโดยทั่วไป: 3-5 วันทำการ\n\n**CAAT (ใบอนุญาตบิน):**\n- เว็บ aviation.go.th\n- โทร CAAT 02-287-0320\n- ระยะเวลาโดยทั่วไป: 15-30 วันทำการ\n\n**ถ้าให้ทีมช่วยดำเนินการ:**\n- LINE: @dji13service\n- แจ้งชื่อและรหัสติดตาม\n- ทีมตรวจสอบและแจ้งผลให้ทันทีครับ",
    active: true,
  },
  {
    id: "registration_fee",
    number: 6,
    name: "Registration Fee",
    description: "ถามค่าธรรมเนียมการขึ้นทะเบียนและขออนุญาต",
    triggers: [
      "ค่าธรรมเนียม", "ค่าใช้จ่าย", "ราคา", "เท่าไหร่", "เสียเงินไหม",
      "ฟรีไหม", "fee", "cost", "price", "เสียค่า",
    ],
    policy: "แจ้งค่าธรรมเนียมราชการ และค่าบริการทีมช่วยดำเนินการ",
    responseTemplate:
      "ค่าธรรมเนียมครับ:\n\n**กสทช. (ขึ้นทะเบียนโดรน):**\n- ค่าธรรมเนียมราชการ: **ฟรี**\n\n**CAAT (RPL — ใบอนุญาตนักบินโดรน):**\n- ค่าสมัครสอบ: ~500 บาท\n- ค่าหลักสูตรอบรม (FTO): 2,500–8,000 บาท\n- ค่าออกใบอนุญาต: ~500 บาท\n- รวมโดยประมาณ: 3,500–9,000 บาท\n\n**บริการทีมเอกสาร DJI 13 Store:**\n- ช่วยขึ้นทะเบียน กสทช.: สอบถามราคา\n- ช่วยจัดเตรียมเอกสาร CAAT: สอบถามราคา\n\nติดต่อ LINE: @dji13service เพื่อรับใบเสนอราคาครับ",
    active: true,
  },
  {
    id: "drone_category",
    number: 7,
    name: "Drone Category & Regulations",
    description: "ถามประเภทโดรนและข้อกำหนดกฎหมายการบิน",
    triggers: [
      "ประเภทโดรน", "หมวดโดรน", "กฎหมายโดรน", "กฎการบิน", "ห้ามบินที่ไหน",
      "no fly zone", "พื้นที่หวงห้าม", "บินได้ไหม", "บินได้ที่ไหน",
      "ข้อกำหนด", "regulation", "กฎ", "ผิดกฎไหม",
    ],
    policy: "อธิบายหมวดหมู่โดรนตาม กสทช./CAAT และพื้นที่ที่บินได้/ไม่ได้",
    responseTemplate:
      "ประเภทโดรนและข้อกำหนดในไทยครับ:\n\n**การแบ่งตาม กสทช.:**\n- **น้ำหนัก < 250 กรัม**: ไม่ต้องขึ้นทะเบียน\n- **น้ำหนัก 250 กรัม – 25 กก.**: ต้องขึ้นทะเบียน กสทช.\n- **น้ำหนัก > 25 กก.**: ต้องขออนุญาต CAAT เพิ่มเติม\n\n**พื้นที่ห้ามบิน (No-Fly Zone):**\n- สนามบิน และรัศมี 9 กม. โดยรอบ\n- พระราชวัง / ทำเนียบรัฐบาล\n- โรงพยาบาล / สถานที่ราชการ\n- พื้นที่ชุมนุมสาธารณะ\n- เหนือกว่า 300 ฟุต AGL\n\n**ต้องขอ CAAT เพิ่มเติมถ้า:**\n- บินเชิงพาณิชย์ (รับเงิน)\n- บินในพื้นที่ควบคุม\n- บินกลางคืน\n\nตรวจสอบ No-Fly Zone ได้ที่แอป AirMap หรือ Drone Thailand\n\nสอบถามเพิ่มเติม LINE: @dji13service ครับ",
    active: true,
  },
  {
    id: "renewal",
    number: 8,
    name: "License Renewal",
    description: "ต่ออายุทะเบียนโดรนหรือใบอนุญาต CAAT",
    triggers: [
      "ต่ออายุ", "renew", "หมดอายุ", "expired", "ต้องต่อ", "ต่อทะเบียน",
      "อายุทะเบียน", "ใบอนุญาตหมด", "ต้องต่ออายุไหม",
    ],
    policy: "อธิบายกระบวนการต่ออายุทะเบียน กสทช. และใบอนุญาต CAAT",
    responseTemplate:
      "การต่ออายุทะเบียนโดรนครับ:\n\n**กสทช. (ทะเบียนโดรน):**\n- อายุทะเบียน: ไม่มีกำหนดหมดอายุ (ปัจจุบัน)\n- แต่ต้องแจ้งเปลี่ยนแปลงถ้า: เปลี่ยนเจ้าของ / โดรนเสียหายหนัก\n- เว็บ drone.nbtc.go.th\n\n**CAAT (RPL — ใบอนุญาตนักบิน):**\n- อายุใบอนุญาต: 2 ปี\n- ต่ออายุก่อนหมด 90 วัน (แนะนำ)\n- ต้องมี Flying Hours ขั้นต่ำตามที่ CAAT กำหนด\n- ยื่นขอต่ออายุที่ aviation.go.th\n\nต้องการให้ทีมช่วยดำเนินการ LINE: @dji13service ครับ",
    active: true,
  },
  {
    id: "violation",
    number: 9,
    name: "Violation & Fine",
    description: "โดนปรับ / บินผิดกฎ / ถูกตักเตือน",
    triggers: [
      "โดนปรับ", "ถูกปรับ", "ค่าปรับ", "บินผิดกฎ", "ผิดกฎหมาย",
      "ถูกจับ", "ฝ่าฝืน", "penalty", "fine", "violation", "ผิดกฎ",
    ],
    policy: "แจ้งข้อมูลบทลงโทษและแนะนำขั้นตอนหลังโดนปรับ",
    responseTemplate:
      "บทลงโทษการบินโดรนผิดกฎในไทยครับ:\n\n**พระราชบัญญัติการเดินอากาศ:**\n- บินโดยไม่ขึ้นทะเบียน: **ปรับไม่เกิน 40,000 บาท**\n- บินในพื้นที่หวงห้าม: **ปรับไม่เกิน 40,000 บาท หรือจำคุก**\n- บินเชิงพาณิชย์โดยไม่มี RPL: **ปรับไม่เกิน 40,000 บาท**\n\n**กฎหมายที่เกี่ยวข้อง:**\n- พ.ร.บ.การเดินอากาศ พ.ศ. 2497\n- ประกาศ กสทช. เรื่องโทรคมนาคม\n- พ.ร.บ.วิทยุคมนาคม พ.ศ. 2498\n\n**ถ้าโดนตักเตือน/ปรับ:**\n1. อย่าบินอีกจนกว่าจะดำเนินการถูกต้อง\n2. ขึ้นทะเบียน กสทช. ให้ถูกต้องก่อน\n3. ติดต่อทีมช่วยจัดการเอกสาร LINE: @dji13service ครับ",
    active: true,
  },
  {
    id: "contact_doc_team",
    number: 10,
    name: "Contact Document Team",
    description: "ถามช่องทางติดต่อทีมเอกสาร",
    triggers: [
      "ติดต่อ", "contact", "line", "ไลน์", "เบอร์โทร", "โทรศัพท์",
      "phone", "ช่องทาง", "facebook", "ที่อยู่",
    ],
    policy: "ให้ข้อมูลช่องทางติดต่อทีมเอกสารอย่างถูกต้อง",
    responseTemplate:
      "ช่องทางติดต่อ **ทีมเอกสาร DJI 13 Store** ครับ\n\n**LINE OA**: @dji13service\n**Facebook**: DJI 13 Store\n**โทร**: 065-694-6155\n**เวลาทำการ**: จันทร์–ศุกร์ 9:00–17:00 น.\n\n**บริการที่ช่วยได้:**\n- ขึ้นทะเบียนโดรน กสทช.\n- จัดเตรียมเอกสาร CAAT\n- ต่ออายุใบอนุญาต\n- ปรึกษากฎหมายการบินโดรน",
    active: true,
  },
  {
    id: "admin_escalation",
    number: 11,
    name: "Admin Escalation",
    description: "ต้องการคุยกับเจ้าหน้าที่จริง",
    triggers: ["แอดมิน", "admin", "พนักงาน", "คนจริง", "เจ้าหน้าที่", "โอนสาย", "ขอคุยกับ", "ต้องการคุยกับคน"],
    policy: "ส่งต่อทีมงานโดยทันที",
    responseTemplate:
      "ได้เลยครับ! กำลังส่งให้ทีมงานดูแลต่อทันทีครับ\n\n**ติดต่อด่วน:**\n- LINE: @dji13service\n- โทร: 065-694-6155\n- เวลาทำการ: จันทร์–ศุกร์ 9:00–17:00 น.",
    active: true,
  },
  {
    id: "unclear_intent",
    number: 12,
    name: "Other / Unclear",
    description: "ข้อความไม่ชัดเจน",
    triggers: [],
    policy: "ตอบสุภาพ แนะนำว่าช่วยได้เรื่องอะไรบ้าง",
    responseTemplate:
      "ขอบคุณที่ติดต่อ **ทีมเอกสาร DJI 13 Store** ครับ!\n\nผมช่วยได้เรื่องเหล่านี้ครับ:\n- ขึ้นทะเบียนโดรนกับ **กสทช.**\n- ขออนุญาต **CAAT** (RPL / บินพาณิชย์)\n- เอกสารที่ต้องใช้และขั้นตอน\n- ต่ออายุทะเบียน / ใบอนุญาต\n- กฎหมายการบินโดรนในไทย\n\nลองพิมพ์ เช่น 'ขึ้นทะเบียน กสทช.' หรือ 'ขอ CAAT' ได้เลยครับ!",
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
