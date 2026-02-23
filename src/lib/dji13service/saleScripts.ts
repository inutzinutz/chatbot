export interface SaleScript {
  id: number;
  triggers: string[];
  customerExample: string;
  adminReply: string;
  tags: string[];
}

export const saleScripts: SaleScript[] = [
  {
    id: 3001,
    triggers: ["ขึ้นทะเบียน", "ลงทะเบียน", "กสทช", "register", "ทะเบียนโดรน"],
    customerExample: "อยากขึ้นทะเบียนโดรน กสทช.",
    adminReply:
      "ช่วยดำเนินการขึ้นทะเบียนโดรนกับ กสทช. แทนได้เลยครับ!\n\nขอทราบ:\n1. รุ่นโดรน และ Serial Number\n2. สำเนาบัตรประชาชน\n3. รูปถ่ายโดรน 4 ด้าน\n\nส่งข้อมูลมาได้เลยครับ",
    tags: ["กสทช.", "register", "นbtc"],
  },
  {
    id: 3002,
    triggers: ["caat", "รpl", "บินพาณิชย์", "บินรับจ้าง", "ใบอนุญาต"],
    customerExample: "อยากได้ใบอนุญาตบินโดรน CAAT",
    adminReply:
      "ช่วยแนะนำและจัดเตรียมเอกสาร CAAT ได้เลยครับ!\n\nขอทราบ:\n1. ปัจจุบันมีประสบการณ์บินโดรนนานแค่ไหน?\n2. บินเพื่อวัตถุประสงค์อะไร (ถ่ายภาพ/สำรวจ/อื่นๆ)?\n3. รุ่นโดรนที่ใช้\n\nจะแนะนำ FTO และแผนดำเนินการที่เหมาะสมครับ",
    tags: ["caat", "rpl", "license"],
  },
  {
    id: 3003,
    triggers: ["ต่ออายุ", "หมดอายุ", "renew", "ต้องต่อ"],
    customerExample: "ต้องการต่ออายุใบอนุญาตโดรน",
    adminReply:
      "ช่วยต่ออายุได้เลยครับ!\n\nขอทราบ:\n1. เป็นการต่ออายุอะไร? (ทะเบียน กสทช. / RPL CAAT)\n2. วันหมดอายุปัจจุบัน\n\nแนะนำดำเนินการก่อนหมดอายุ 90 วัน จะได้ไม่มีช่วงว่างครับ",
    tags: ["ต่ออายุ", "renew", "caat", "กสทช."],
  },
  {
    id: 3004,
    triggers: ["กฎหมาย", "ปรึกษา", "ผิดกฎ", "ถูกปรับ", "บินได้ไหม"],
    customerExample: "อยากปรึกษาเรื่องกฎหมายบินโดรน",
    adminReply:
      "ยินดีให้คำปรึกษาครับ!\n\nสามารถถามได้เลยครับ เรื่อง:\n- พื้นที่ที่บินได้/ไม่ได้\n- กฎข้อบังคับที่เกี่ยวข้อง\n- ขั้นตอนขออนุญาตพิเศษ\n\nหรือนัดปรึกษา 1:1 ทาง LINE Call ก็ได้ครับ",
    tags: ["กฎหมาย", "consult", "regulation"],
  },
];

export function matchSaleScript(message: string): SaleScript | undefined {
  const lower = message.toLowerCase();
  return saleScripts.find((s) =>
    s.triggers.some((t) => lower.includes(t.toLowerCase()))
  );
}
