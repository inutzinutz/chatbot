export interface SaleScript {
  id: number;
  triggers: string[];
  customerExample: string;
  adminReply: string;
  tags: string[];
}

export const saleScripts: SaleScript[] = [
  {
    id: 2001,
    triggers: ["ซ่อม", "repair", "เสีย", "พัง", "ไม่บิน", "ส่งซ่อม", "อยากซ่อม"],
    customerExample: "อยากส่งโดรนซ่อม",
    adminReply:
      "รับซ่อมโดรน DJI ทุกรุ่นครับ! ทีมช่างผู้เชี่ยวชาญเฉพาะ DJI โดยตรง\n\nขั้นตอน: แจ้งอาการ → ประเมินฟรี → ยืนยันซ่อม → รับกลับ\n\nแจ้งรุ่นโดรนและอาการที่เกิดขึ้นมาได้เลยครับ",
    tags: ["repair", "service"],
  },
  {
    id: 2002,
    triggers: ["care refresh", "dji care", "เคลม", "claim", "ประกัน"],
    customerExample: "อยากเคลม DJI Care Refresh",
    adminReply:
      "ช่วยดำเนินการเคลม DJI Care Refresh ได้เลยครับ!\n\nขอทราบ:\n1. รุ่นโดรน\n2. Care Refresh ยังไม่หมดอายุไหม?\n3. อาการที่เกิดขึ้น\n\nส่งรูปความเสียหายมาด้วยได้เลยครับ",
    tags: ["care refresh", "claim", "warranty"],
  },
  {
    id: 2003,
    triggers: ["ตกน้ำ", "น้ำเข้า", "water damage", "เปียก"],
    customerExample: "โดรนตกน้ำ",
    adminReply:
      "ถอดแบตเตอรี่ออกทันทีครับ! อย่าเปิดเครื่องก่อนนะครับ\n\nใส่ถุงข้าวสาร/silica gel ทิ้งไว้ 24-48 ชั่วโมงก่อน\n\nส่งรูปสภาพโดรนมาให้ช่างดูก่อนได้เลยครับ มี DJI Care Refresh ไหมครับ?",
    tags: ["water damage", "emergency", "repair"],
  },
  {
    id: 2004,
    triggers: ["flyaway", "บินหนี", "หาย", "สูญหาย", "โดรนหาย"],
    customerExample: "โดรนบินหนีหาย",
    adminReply:
      "ใช้ DJI Fly → 'Find My Drone' ดูพิกัดสุดท้ายทันทีครับ!\n\nบันทึก Flight Log ไว้ก่อนเลยครับ (สำคัญมากสำหรับการเคลม)\n\nมี DJI Care Refresh Plus ไหมครับ? ถ้ามีช่วยยื่นเรื่อง Flyaway Claim ได้เลยครับ",
    tags: ["flyaway", "lost", "emergency", "care refresh"],
  },
  {
    id: 2005,
    triggers: ["gimbal", "กิมบอล", "กล้องสั่น", "ภาพสั่น", "gimbal error"],
    customerExample: "Gimbal Error / กล้องสั่น",
    adminReply:
      "ลอง Gimbal Calibration ในแอป DJI Fly ก่อนเลยครับ\n\nถ้ายังมีปัญหา ส่งวิดีโออาการมาให้ช่างดูได้เลยครับ ประเมินฟรีครับ",
    tags: ["gimbal", "camera", "repair"],
  },
  {
    id: 2006,
    triggers: ["อะไหล่", "spare", "parts", "ใบพัด", "มอเตอร์แท้", "แบตแท้"],
    customerExample: "อยากซื้ออะไหล่แท้ DJI",
    adminReply:
      "มีอะไหล่แท้ DJI ครับ ใบพัด/มอเตอร์/แบตเตอรี่/Shell ทุกรุ่น\n\nแจ้งรุ่นโดรนมาได้เลยครับ จะเช็คสต็อกและราคาให้ทันทีครับ",
    tags: ["spare parts", "accessories"],
  },
  {
    id: 2007,
    triggers: ["error", "error code", "warning", "ขึ้น error", "error ขึ้น"],
    customerExample: "โดรนขึ้น Error Code",
    adminReply:
      "แจ้ง Error Code ที่ขึ้นบนหน้าจอหรือแอปมาได้เลยครับ พร้อมรุ่นโดรน\n\nช่างจะช่วยวินิจฉัยสาเหตุและวิธีแก้ให้ครับ",
    tags: ["error", "diagnostic", "repair"],
  },
  {
    id: 2008,
    triggers: ["firmware", "อัปเดต", "update", "ซอฟต์แวร์"],
    customerExample: "อยากอัปเดต Firmware",
    adminReply:
      "ชาร์จโดรนและ RC ให้ได้ 50%+ ก่อนครับ แล้วอัปเดตผ่านแอป DJI Fly\n\nถ้าอัปเดตแล้วมีปัญหา นำมาที่ร้านได้เลยครับ ช่วยแก้ให้ฟรีครับ",
    tags: ["firmware", "update", "software"],
  },
];

export function matchSaleScript(message: string): SaleScript | undefined {
  const lower = message.toLowerCase();
  return saleScripts.find((s) =>
    s.triggers.some((t) => lower.includes(t.toLowerCase()))
  );
}
