/* ------------------------------------------------------------------ */
/*  DJI 13 Service Plus — Intent Policies                              */
/*  เน้น: ช่วยช่างซ่อม + ลูกค้า ส่งซ่อม/เคลม                         */
/* ------------------------------------------------------------------ */

export interface DiscontinuedMapping {
  triggers: string[];
  recommended: string;
  note?: string;
}

const ADMIN_ESCALATION_TRIGGERS = [
  "แอดมิน", "admin", "พนักงาน", "คนจริง", "เจ้าหน้าที่",
  "ตัวแทน", "representative", "human", "คุยกับคน", "ช่าง",
];

const STOCK_TRIGGERS = [
  "มีของไหม", "มีของมั้ย", "ของมีไหม", "มีอะไหล่", "อะไหล่มีไหม",
  "stock", "availability", "available", "พร้อมส่งไหม",
];

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

export function matchStockInquiry(message: string): boolean {
  return includesAny(message.toLowerCase(), STOCK_TRIGGERS);
}

export function matchVatRefund(_message: string): boolean {
  return false; // N/A for service BU
}

export function matchContactIntent(message: string): boolean {
  return includesAny(message.toLowerCase(), CONTACT_TRIGGERS);
}

export function matchDiscontinued(_message: string): DiscontinuedMapping | undefined {
  return undefined;
}

export function buildAdminEscalationResponse(): string {
  return "ได้เลยครับ! กำลังส่งให้ทีมช่างหรือแอดมินดูแลต่อทันทีครับ\n\nติดต่อด่วน:\n- LINE: @dji13support\n- โทร: 065-694-6155";
}

export function buildStockCheckResponse(): string {
  return "ขออนุญาตตรวจสอบสต็อกอะไหล่กับทีมงานก่อนนะครับ เพื่อข้อมูลที่ถูกต้องครับ";
}

export function buildVatRefundResponse(): string {
  return "ขออภัยครับ บริการนี้ไม่มี VAT Refund ครับ";
}

export function buildContactChannelsResponse(): string {
  return (
    "ช่องทางติดต่อ DJI 13 Service Plus ครับ\n\n" +
    "LINE: @dji13support\n" +
    "Facebook: DJI 13 Store\n" +
    "โทร: 065-694-6155\n" +
    "เวลาทำการ: จันทร์-เสาร์ 9:00-18:00 น."
  );
}

export function buildDiscontinuedResponse(_mapping: DiscontinuedMapping): string {
  return "ขออภัยครับ สินค้านี้ไม่มีในระบบแล้วครับ";
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
  // ── ลูกค้า ──
  {
    id: "greeting",
    number: 1,
    name: "Greeting",
    description: "ลูกค้าหรือช่างทักทายหรือเริ่มต้นการสนทนา",
    triggers: ["สวัสดี", "หวัดดี", "ดีครับ", "hello", "hi", "hey"],
    policy: "ทักทายกลับ แนะนำบริการซ่อม/เคลม DJI 13 Service Plus",
    responseTemplate: "สวัสดีครับ! ยินดีต้อนรับสู่ **DJI 13 Service Plus** ครับ\n\nผมช่วยได้เรื่องเหล่านี้ครับ:\n- ส่งซ่อมโดรน DJI ทุกรุ่น\n- เคลม DJI Care Refresh\n- อะไหล่แท้ DJI\n- วินิจฉัยอาการโดรน\n- ตรวจ Flight Log\n\nมีอะไรให้ช่วยครับ?",
    active: true,
  },
  {
    id: "repair_inquiry",
    number: 2,
    name: "Repair Inquiry",
    description: "ลูกค้าสอบถามเรื่องการส่งซ่อมโดรน DJI",
    triggers: ["ซ่อม", "repair", "เสีย", "broken", "พัง", "ไม่บิน", "บินไม่ขึ้น", "ตก", "ชน", "น้ำเข้า", "กิมบอลเสีย", "กล้องเสีย", "มอเตอร์", "ใบพัด", "เบอร์ซ่อม"],
    policy: "ให้ข้อมูลขั้นตอนการส่งซ่อม ถามอาการก่อนแนะนำ",
    responseTemplate: "รับซ่อมโดรน DJI ทุกรุ่นครับ!\n\n**ขั้นตอนการส่งซ่อม**\n1. แจ้งอาการที่ Line @dji13support หรือโทร 065-694-6155\n2. ส่งภาพ/วิดีโออาการ (ถ้ามี)\n3. ทีมช่างประเมินราคาเบื้องต้น (ฟรี)\n4. ยืนยันซ่อม → นำมาที่ร้านหรือจัดส่ง\n5. ซ่อมเสร็จ → แจ้งผล → รับกลับ\n\nอาการที่เกิดขึ้นเป็นอย่างไรครับ?",
    active: true,
  },
  {
    id: "repair_cost",
    number: 3,
    name: "Repair Cost Estimate",
    description: "ลูกค้าสอบถามราคาค่าซ่อม",
    triggers: ["ราคาซ่อม", "ค่าซ่อม", "ซ่อมราคา", "ซ่อมเท่าไหร่", "ค่าบริการ", "ราคาเปลี่ยน", "ค่าเปลี่ยน", "ราคา"],
    policy: "แจ้งราคาเริ่มต้น แต่ต้องประเมินจริงก่อนยืนยัน ห้ามรับปากราคาที่แน่นอน",
    responseTemplate: "ราคาซ่อมโดรน DJI เบื้องต้นครับ:\n\n- ประเมิน/วินิจฉัย: ฟรี\n- เปลี่ยนใบพัด: เริ่มต้น 300 บาท\n- เปลี่ยนมอเตอร์: เริ่มต้น 800 บาท\n- ซ่อม Gimbal/กล้อง: เริ่มต้น 1,500 บาท\n- ซ่อมบอร์ด ESC/FC: เริ่มต้น 2,000 บาท\n- เปลี่ยน Shell ตัวถัง: เริ่มต้น 600 บาท\n\nราคาจริงขึ้นอยู่กับรุ่นและความเสียหาย กรุณาส่งอาการและภาพมาก่อนครับ\nLINE: @dji13support",
    active: true,
  },
  {
    id: "care_refresh_claim",
    number: 4,
    name: "DJI Care Refresh Claim",
    description: "ลูกค้าสอบถามเรื่องการเคลม DJI Care Refresh",
    triggers: ["care refresh", "dji care", "เคลมประกัน", "เคลม care", "care expired", "care หมดอายุ", "ประกัน dji", "care plan"],
    policy: "อธิบายขั้นตอนการเคลม DJI Care Refresh ถามว่า Care ยังไม่หมดอายุหรือเปล่า",
    responseTemplate: "DJI 13 Service Plus ช่วยดำเนินการเคลม DJI Care Refresh ได้เลยครับ!\n\n**เงื่อนไขการเคลม**\n- มี DJI Care Refresh ที่ยังไม่หมดอายุ\n- แต่ละปีเคลมได้ตามจำนวนสิทธิ์ในแพ็กเกจ\n- กรณี Flyaway ต้องมี Care Refresh Plus\n\n**ขั้นตอน**\n1. แจ้งอาการ + ส่งรูปความเสียหาย\n2. ทีมตรวจสอบสิทธิ์ Care Refresh\n3. ยื่นเรื่องต่อ DJI Service Center\n4. รับโดรนเครื่องใหม่/ซ่อมกลับ\n\nDJI Care Refresh ของคุณยังมีอายุอยู่ไหมครับ?",
    active: true,
  },
  {
    id: "flyaway_claim",
    number: 5,
    name: "Flyaway / Lost Drone",
    description: "ลูกค้าโดรนสูญหาย/บินหนี",
    triggers: ["flyaway", "บินหนี", "หาย", "สูญหาย", "หาไม่เจอ", "lost", "สัญญาณหาย", "signal lost", "โดรนหาย"],
    policy: "แนะนำขั้นตอนทันทีหลังโดรนหาย: ใช้ DJI Find My Drone, ตรวจ Flight Log, เคลม Flyaway ถ้ามี Care Refresh Plus",
    responseTemplate: "โดรนสูญหาย/บินหนี ทำตามขั้นตอนนี้ทันทีครับ!\n\n**ทำทันที:**\n1. เปิดแอป DJI Fly → ฟังก์ชัน 'Find My Drone' → ดูพิกัดสุดท้าย\n2. ตรวจ Flight Record ในแอปดูพิกัดล่าสุดก่อนหาย\n3. บันทึก Flight Log ไว้ก่อน (สำคัญมาก!)\n\n**เคลม Flyaway:**\n- ต้องมี DJI Care Refresh Plus เท่านั้น\n- ส่ง Flight Log + หลักฐานให้เรา → ช่วยยื่นเรื่อง\n\nแจ้งมาได้เลยครับ มี Care Refresh Plus ไหม?",
    active: true,
  },
  {
    id: "water_damage",
    number: 6,
    name: "Water Damage",
    description: "โดรนตกน้ำหรือโดนน้ำ",
    triggers: ["ตกน้ำ", "น้ำเข้า", "water", "เปียก", "โดนฝน", "flood", "จมน้ำ"],
    policy: "แนะนำขั้นตอนฉุกเฉินทันทีหลังโดรนตกน้ำ เพื่อลดความเสียหาย",
    responseTemplate: "โดรนตกน้ำ ทำตามนี้ทันทีครับ!\n\n**ห้ามทำ:** อย่าเปิดเครื่อง อย่าชาร์จ!\n\n**ทำทันที:**\n1. ถอดแบตเตอรี่ออกทันที\n2. สลัดน้ำออกให้มากที่สุด\n3. ใช้ผ้าแห้งซับน้ำรอบนอก\n4. ใส่ถุงข้าวสาร/silica gel ทิ้งไว้ 48 ชั่วโมง\n5. นำมาให้ช่างตรวจภายใน (อย่าเพิ่งเปิดเครื่องเด็ดขาด!)\n\nรีบแจ้งที่ LINE @dji13support พร้อมรูปสภาพโดรนครับ\n\nมี DJI Care Refresh ไหมครับ? ถ้ามีอาจเคลมได้ครับ",
    active: true,
  },
  {
    id: "crash_damage",
    number: 7,
    name: "Crash Damage",
    description: "โดรนชน/ตก",
    triggers: ["ชน", "crash", "ตก", "หล่น", "ร่วง", "บินชน", "กระแทก", "พัง", "แตก"],
    policy: "ถามอาการและประเมินความเสียหายเบื้องต้น แนะนำส่งซ่อมหรือเคลม Care Refresh",
    responseTemplate: "โดรนชน/ตก — ให้ตรวจสอบเบื้องต้นนี้ครับ:\n\n**ตรวจสอบทันที:**\n- มีควัน/กลิ่นไหม้ไหม? → ถ้ามี ถอดแบตออกทันที!\n- ใบพัดแตก/หัก → อย่าบิน\n- Gimbal/กล้องผิดรูป\n- มีรอยแตกที่ตัวถัง\n\n**ขั้นตอน:**\n1. ถ่ายภาพความเสียหายทุกมุม\n2. บันทึก Flight Log ไว้\n3. ส่งรูปมาที่ LINE @dji13support\n4. ทีมช่างประเมินราคาซ่อม (ฟรี)\n\nมี DJI Care Refresh ไหมครับ? อาจเคลมได้ครับ!",
    active: true,
  },
  {
    id: "gimbal_problem",
    number: 8,
    name: "Gimbal Problem",
    description: "ปัญหา Gimbal โดรน: สั่น หมุนไม่ได้ Error",
    triggers: ["gimbal", "กิมบอล", "กล้องสั่น", "กล้องหมุน", "gimbal overload", "gimbal error", "กล้องโดรน", "ภาพสั่น"],
    policy: "วินิจฉัยอาการ Gimbal เบื้องต้น แนะนำ Calibrate หรือส่งซ่อม",
    responseTemplate: "ปัญหา Gimbal — วินิจฉัยเบื้องต้นครับ:\n\n**อาการ Gimbal Overload:**\n→ ลองทำ Gimbal Calibration ในแอป DJI Fly\n→ ตรวจว่ามีสิ่งกีดขวาง Gimbal ไหม\n→ รีสตาร์ทโดรนครั้งเดียว\n\n**อาการ Gimbal สั่น/ภาพสั่น:**\n→ Calibrate Gimbal ในแอป\n→ ตรวจใบพัดว่าสมดุลไหม\n→ ถ้ายังมีอยู่ → ต้องซ่อม Gimbal Motor\n\n**อาการ Gimbal หมุนไม่ได้/ค้าง:**\n→ ตรวจ Gimbal Protector ออกหรือยัง\n→ ตรวจสาย Ribbon ไม่หักไหม\n→ ต้องส่งซ่อมครับ\n\nส่งวิดีโออาการมาได้ที่ LINE @dji13support ครับ",
    active: true,
  },
  {
    id: "signal_connection",
    number: 9,
    name: "Signal / Connection Problem",
    description: "ปัญหาสัญญาณ RC สูญหาย ต่อไม่ติด",
    triggers: ["สัญญาณ", "signal", "rc", "remote", "ต่อไม่ติด", "disconnected", "disconnect", "ไม่จับ", "no signal", "weak signal", "สัญญาณอ่อน"],
    policy: "ให้ขั้นตอนแก้ปัญหาสัญญาณเบื้องต้น",
    responseTemplate: "ปัญหาสัญญาณ/RC — ลองทำตามขั้นตอนนี้ครับ:\n\n**ตรวจสอบพื้นฐาน:**\n1. รีสตาร์ท RC และโดรนใหม่\n2. ตรวจ Firmware RC และโดรนต้อง Version เดียวกัน\n3. Link RC กับโดรนใหม่ (ดูวิธีในคู่มือ)\n4. ทดสอบในพื้นที่โล่ง ไม่มีสัญญาณรบกวน\n5. ตรวจ Antenna RC ไม่หักไหม\n\n**ถ้ายังมีปัญหา:**\n→ อาจเป็นปัญหา RC Module หรือ OcuSync Board\n→ ส่งซ่อมที่ DJI 13 Service Plus ครับ\n\nโดรนรุ่นอะไร และ RC รุ่นอะไรครับ?",
    active: true,
  },
  {
    id: "battery_problem",
    number: 10,
    name: "Battery Problem",
    description: "ปัญหาแบตเตอรี่โดรน: ชาร์จไม่เข้า พองตัว ปิดเอง",
    triggers: ["แบตเตอรี่", "battery", "ชาร์จไม่เข้า", "แบตพอง", "แบตหมดเร็ว", "ปิดเอง", "battery warning", "low battery", "แบต"],
    policy: "วินิจฉัยอาการแบตเตอรี่ เตือนอันตรายถ้าแบตพอง",
    responseTemplate: "ปัญหาแบตเตอรี่โดรน DJI ครับ:\n\n**แบตพอง/บวม:**\n→ อันตราย! อย่าชาร์จ อย่าใช้งาน\n→ เก็บในที่ปลอดภัย ห่างจากวัสดุติดไฟ\n→ ต้องเปลี่ยนทันที\n\n**ชาร์จไม่เข้า:**\n→ ลองเปลี่ยนสายชาร์จ/Adapter\n→ ตรวจพอร์ตชาร์จว่ามีสิ่งแปลกปลอมไหม\n→ ลอง Refresh แบต (Discharge ก่อนชาร์จ)\n\n**แบตหมดเร็ว:**\n→ ตรวจ Cell Voltage ผ่านแอป DJI Fly\n→ ถ้า Cell ไม่สมดุล → ต้องเปลี่ยนแบต\n\n**แบต Error / Warning:**\n→ บันทึก Error Code มาด้วยครับ\n→ ส่งมาที่ LINE @dji13support",
    active: true,
  },
  {
    id: "firmware_update",
    number: 11,
    name: "Firmware Update",
    description: "ถามเรื่องการอัปเดต Firmware โดรน DJI",
    triggers: ["firmware", "อัปเดต", "update", "version", "ซอฟต์แวร์", "software", "ติดตั้ง", "upgrade"],
    policy: "แนะนำวิธีอัปเดต Firmware ที่ถูกต้อง เตือนขั้นตอนสำคัญ",
    responseTemplate: "วิธีอัปเดต Firmware โดรน DJI ที่ถูกต้องครับ:\n\n**ก่อนอัปเดต:**\n1. ชาร์จโดรนและ RC ให้ได้ 50%+\n2. ตรวจให้แน่ใจว่า Internet เสถียร\n3. อัปเดต DJI Fly/Assistant 2 ให้ล่าสุดก่อน\n\n**ขั้นตอน:**\n1. เชื่อมต่อโดรนกับ RC\n2. เปิดแอป DJI Fly → มุมขวาบน → อัปเดต\n3. รอจนเสร็จ อย่าปิดแอปหรือปิดไฟ!\n4. โดรนจะรีสตาร์ทอัตโนมัติ\n\n⚠️ ถ้าอัปเดตแล้วมีปัญหา นำมาที่ร้านได้เลยครับ — ฟรีแก้ปัญหา Firmware",
    active: true,
  },
  {
    id: "flight_log_analysis",
    number: 12,
    name: "Flight Log Analysis",
    description: "ขอให้วิเคราะห์ Flight Log หลังโดรนมีปัญหา",
    triggers: ["flight log", "log", "บันทึกการบิน", "วิเคราะห์", "สาเหตุ", "ทำไมตก", "ทำไมหาย", "ข้อมูลการบิน"],
    policy: "แนะนำให้ส่ง Flight Log มาให้ช่างวิเคราะห์ อธิบายวิธีดึง Log",
    responseTemplate: "บริการวิเคราะห์ Flight Log ครับ!\n\n**วิธีดึง Flight Log:**\nDJI Fly App:\n1. เปิดแอป → เมนูโปรไฟล์\n2. เลือก 'Flight Records'\n3. เลือก Flight ที่ต้องการ → แชร์ไฟล์\n\nDJI Assistant 2 (PC):\n1. เชื่อมโดรนผ่าน USB\n2. Flight Records → Export\n\n**ส่งมาที่:**\n- LINE: @dji13support\n- อธิบายอาการที่เกิดขึ้นด้วย\n\nบริการวิเคราะห์ Log: 300 บาท (ถ้าส่งซ่อมต่อ — คิดรวมในค่าซ่อม)\n\nโดรนรุ่นไหนครับ? มีอาการอะไรให้ช่วยวินิจฉัยครับ",
    active: true,
  },
  {
    id: "calibration",
    number: 13,
    name: "Calibration / Setup",
    description: "ถามเรื่อง Compass Calibration, IMU, Gimbal Cal",
    triggers: ["calibration", "calibrate", "สอบเทียบ", "compass", "imu", "horizon", "เส้นขอบฟ้า", "horizon leveling"],
    policy: "แนะนำขั้นตอน Calibrate ที่ถูกต้อง และสถานที่ที่เหมาะสม",
    responseTemplate: "Calibration โดรน DJI ครับ:\n\n**Compass Calibration:**\n- ทำในพื้นที่โล่ง ห่างโลหะ/โครงสร้างเหล็ก\n- ไม่ควรทำในอาคาร/ห้องคอนกรีต\n- แอป DJI Fly → Safety → Compass Calibration\n- หมุนโดรนตามที่แอปบอก (ตั้งตรง + นอนราบ)\n\n**IMU Calibration:**\n- ต้องทำบนพื้นราบเรียบ\n- ห้องอุณหภูมิปกติ\n- แอป → Safety → IMU Calibration\n- รอจนเสร็จ ~5 นาที\n\n**Gimbal Calibration:**\n- แอป → Camera → Advanced → Gimbal Calibration\n- ต้องทำในที่ไม่มีลม\n\nถ้า Calibrate แล้วยังมีปัญหา → นำมาให้ช่างตรวจที่ร้านได้เลยครับ (ฟรี)",
    active: true,
  },
  {
    id: "spare_parts",
    number: 14,
    name: "Spare Parts Inquiry",
    description: "สอบถามอะไหล่โดรน DJI",
    triggers: ["อะไหล่", "spare", "parts", "ซื้อ", "หาซื้อ", "มีขาย", "ใบพัดแท้", "มอเตอร์แท้", "แบตแท้", "shell", "ฝาครอบ"],
    policy: "แนะนำอะไหล่แท้ DJI ที่มีในร้าน แจ้งราคาเริ่มต้น",
    responseTemplate: "อะไหล่โดรน DJI แท้ที่มีในร้านครับ:\n\n- ใบพัด (Propeller): เริ่ม 350 บาท/คู่\n- มอเตอร์: เริ่ม 1,200 บาท/ตัว\n- แบตเตอรี่: เริ่ม 1,800 บาท\n- Shell ตัวถัง: เริ่ม 450 บาท\n\nราคาขึ้นอยู่กับรุ่นโดรน กรุณาแจ้งรุ่นโดรนเพื่อตรวจสอบความพร้อมของอะไหล่ครับ\n\nLINE: @dji13support | โทร: 065-694-6155",
    active: true,
  },
  {
    id: "technician_guide",
    number: 15,
    name: "Technician Diagnostic Guide",
    description: "ช่างสอบถามขั้นตอนการวินิจฉัย หรือขอ checklist",
    triggers: ["checklist", "ช่างซ่อม", "วินิจฉัย", "ตรวจสอบ", "ขั้นตอนซ่อม", "diagnostic", "error code", "error", "รหัสผิดพลาด", "วิธีแก้"],
    policy: "ให้ขั้นตอนการวินิจฉัยที่เป็นระบบสำหรับช่าง ครอบคลุม ESC, Motor, Gimbal, Board",
    responseTemplate: "Checklist วินิจฉัยโดรน DJI สำหรับช่างครับ:\n\n**Step 1 — Visual Inspection**\n□ ตรวจ Shell แตก/บิ่น\n□ ตรวจใบพัดสมดุล ไม่แตก ไม่โค้งงอ\n□ ตรวจ Gimbal ไม่ผิดรูป สาย Ribbon ไม่หัก\n□ ตรวจพอร์ตชาร์จ ขา USB ไม่งอ\n\n**Step 2 — Power Up Check**\n□ แบตเตอรี่ชาร์จเต็ม\n□ เปิดเครื่อง → ฟังเสียงมอเตอร์ Beep\n□ ตรวจ LED Status (Normal / Error)\n□ Gimbal Initialize ปกติไหม\n\n**Step 3 — DJI Assistant 2**\n□ เชื่อมต่อ USB → ดู Error Code\n□ ตรวจ Motor Status แต่ละตัว\n□ ดู Sensor Status (IMU / Compass / Vision)\n□ ดู Log ล่าสุด\n\n**Step 4 — Motor Test**\n□ Motor Test ทีละตัว\n□ ตรวจความสั่นสะเทือน\n□ เสียงผิดปกติ → เปลี่ยนมอเตอร์\n\nแจ้ง Error Code ถ้ามี จะช่วยวินิจฉัยได้แม่นยำขึ้นครับ",
    active: true,
  },
  {
    id: "error_codes",
    number: 16,
    name: "DJI Error Code Guide",
    description: "ถามเรื่อง Error Code โดรน DJI",
    triggers: ["error code", "รหัส error", "warning", "คำเตือน", "critical error", "motor error", "imu error", "compass error", "vision error", "esc error"],
    policy: "ให้คำอธิบาย Error Code DJI ที่พบบ่อย พร้อมวิธีแก้เบื้องต้น",
    responseTemplate: "Error Code DJI ที่พบบ่อยและวิธีแก้เบื้องต้นครับ:\n\n**Motor Error**\n→ ตรวจใบพัดว่าขัดหรือไม่ | ทดสอบ Motor แต่ละตัว | เปลี่ยนมอเตอร์ถ้าเสีย\n\n**IMU Error**\n→ ทำ IMU Calibration | อุณหภูมิต้องปกติ\n\n**Compass Error**\n→ ทำ Compass Calibration ในพื้นที่โล่ง | ห่างสนามแม่เหล็ก\n\n**Gimbal Overload**\n→ ปลด Gimbal Protector | ทำ Gimbal Calibration | ตรวจ Gimbal Motor\n\n**ESC Error**\n→ ต้องส่งซ่อมบอร์ด ESC\n\n**Vision System Error**\n→ ทำความสะอาดเลนส์ Vision | Calibrate Vision ในแอป\n\nแจ้ง Error Code ที่แสดงบนหน้าจอมาด้วยครับ จะช่วยวินิจฉัยได้ตรงกว่านี้",
    active: true,
  },
  {
    id: "repair_status",
    number: 17,
    name: "Repair Status Inquiry",
    description: "ลูกค้าถามสถานะการซ่อม",
    triggers: ["สถานะ", "status", "ซ่อมเสร็จหรือยัง", "เสร็จหรือยัง", "รับได้เมื่อไหร่", "คืนเมื่อไหร่", "ติดตาม", "track"],
    policy: "แนะนำให้ติดต่อทีมงานโดยตรงสำหรับสถานะการซ่อม",
    responseTemplate: "สำหรับสถานะการซ่อม กรุณาติดต่อทีมงานโดยตรงครับ\n\n**ติดต่อ:**\n- LINE: @dji13support\n- โทร: 065-694-6155\n- เวลาทำการ: จันทร์-เสาร์ 9:00-18:00 น.\n\nแจ้งชื่อและเบอร์โทรที่ใช้ลงทะเบียนซ่อมด้วยจะได้รับข้อมูลรวดเร็วขึ้นครับ",
    active: true,
  },
  {
    id: "shipping_repair",
    number: 18,
    name: "Shipping for Repair",
    description: "ถามวิธีส่งโดรนมาซ่อมทางไปรษณีย์",
    triggers: ["ส่งซ่อม", "ส่งไปรษณีย์", "ส่งทางไปรษณีย์", "ส่งพัสดุ", "ไม่ได้อยู่ใกล้", "ต่างจังหวัด", "ส่งมา", "ส่งโดรน"],
    policy: "แนะนำวิธีการส่งโดรนมาซ่อมอย่างปลอดภัย พร้อมที่อยู่ร้าน",
    responseTemplate: "ส่งโดรนมาซ่อมทางไปรษณีย์ได้เลยครับ!\n\n**วิธีแพ็คโดรนให้ปลอดภัย:**\n1. ถอดใบพัดออกก่อน\n2. ใส่ Gimbal Protector (ถ้ามี)\n3. ห่อด้วยฟองน้ำหนาๆ หรือ Bubble Wrap\n4. ใส่กล่องแข็ง + เติม Packing ให้แน่น\n5. เลือกขนส่งที่น่าเชื่อถือ Kerry/Flash Express\n\n**แจ้งก่อนส่ง:**\n- LINE: @dji13support\n- แจ้งชื่อ-เบอร์โทร-อาการเสีย\n- รอเจ้าหน้าที่ยืนยันที่อยู่\n\n**ค่าส่งคืน:** ลูกค้าออกค่าส่งกลับ (แนะนำให้โอนให้ล่วงหน้า)\n\nโดรนรุ่นไหน อาการเป็นยังไงครับ?",
    active: true,
  },
  {
    id: "warranty_original",
    number: 19,
    name: "DJI Original Warranty",
    description: "ถามเรื่องการรับประกันโดรนที่ซื้อจาก DJI 13 STORE",
    triggers: ["ประกันร้าน", "ประกันจาก dji 13", "รับประกันร้าน", "warranty ร้าน", "ซื้อแล้วเสีย", "ของใหม่เสีย", "just bought", "ซื้อใหม่เสีย"],
    policy: "อธิบายการรับประกันสินค้าจาก DJI 13 STORE แยกจาก DJI Care Refresh",
    responseTemplate: "การรับประกันสินค้าจาก DJI 13 STORE ครับ\n\n**รับประกันจากร้าน:**\n- โดรน DJI ทุกรุ่น: 1 ปี จากวันที่ซื้อ\n- ครอบคลุมชำรุดจากการผลิต (ไม่รวมอุบัติเหตุ)\n- เคลมได้ที่ DJI 13 Service Plus โดยตรง\n\n**DJI Care Refresh (ต่างจากประกันร้าน):**\n- ซื้อเพิ่มเพื่อความคุ้มครองอุบัติเหตุ/ตกน้ำ/flyaway\n- แนะนำซื้อภายใน 48 ชั่วโมงหลังเปิดกล่อง\n\n**นำโดรนมาเคลม:**\n- แสดงใบเสร็จ/หลักฐานการซื้อ\n- LINE: @dji13support | โทร: 065-694-6155",
    active: true,
  },
  {
    id: "contact_service",
    number: 20,
    name: "Contact Service",
    description: "ถามช่องทางติดต่อ DJI 13 Service Plus",
    triggers: ["ติดต่อ", "contact", "line", "ไลน์", "เบอร์โทร", "โทรศัพท์", "phone", "ช่องทาง", "facebook", "ที่อยู่", "address"],
    policy: "ให้ข้อมูลช่องทางติดต่อและที่ตั้งร้านอย่างถูกต้อง",
    responseTemplate: "ช่องทางติดต่อ DJI 13 Service Plus ครับ\n\n**LINE OA**: @dji13support\n**Facebook**: DJI 13 Store\n**โทร**: 065-694-6155\n**เวลาทำการ**: จันทร์-เสาร์ 9:00-18:00 น.\n\n**ส่งซ่อมทางไปรษณีย์:** แจ้ง LINE ก่อนส่งทุกครั้งครับ",
    active: true,
  },
  {
    id: "admin_escalation",
    number: 21,
    name: "Admin Escalation",
    description: "ต้องการคุยกับช่างหรือแอดมินจริง",
    triggers: ["แอดมิน", "admin", "ช่าง", "พนักงาน", "คนจริง", "เจ้าหน้าที่", "โอนสาย", "ขอคุยกับ"],
    policy: "ส่งต่อทีมงาน/ช่างโดยทันที",
    responseTemplate: "ได้เลยครับ! กำลังส่งให้ทีมช่างหรือแอดมินดูแลต่อทันทีครับ\n\n**ติดต่อด่วน:**\n- LINE: @dji13support\n- โทร: 065-694-6155\n- เวลาทำการ: จันทร์-เสาร์ 9:00-18:00 น.",
    active: true,
  },
  {
    id: "unclear_intent",
    number: 22,
    name: "Other / Unclear",
    description: "ข้อความไม่ชัดเจน",
    triggers: [],
    policy: "ตอบสุภาพ แนะนำว่าช่วยได้เรื่องอะไรบ้าง",
    responseTemplate: "ขอบคุณที่ติดต่อ **DJI 13 Service Plus** ครับ!\n\nผมช่วยได้เรื่องเหล่านี้ครับ:\n- ส่งซ่อมโดรน DJI ทุกรุ่น\n- เคลม DJI Care Refresh\n- โดรนตกน้ำ/ชน → ขั้นตอนฉุกเฉิน\n- วินิจฉัยอาการ / Error Code\n- อะไหล่แท้ DJI\n- อัปเดต Firmware / Calibration\n- วิเคราะห์ Flight Log\n\nลองพิมพ์อาการที่เกิดขึ้น เช่น 'gimbal error' หรือ 'โดรนตกน้ำ' ได้เลยครับ!",
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
