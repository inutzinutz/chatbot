export interface SaleScript {
  id: number;
  triggers: string[];
  customerExample: string;
  adminReply: string;
  tags: string[];
}

export const saleScripts: SaleScript[] = [
  {
    id: 1001,
    triggers: ["แบตเตอรี่", "แบต", "battery", "แบตหมด", "แบตเสื่อม", "12v"],
    customerExample: "แบตเตอรี่ 12V",
    adminReply:
      "EV Life Thailand มีแบตเตอรี่ LiFePO4 12V สำหรับรถยนต์ไฟฟ้า EV ทุกรุ่น เช่น BYD, Tesla, MG, Neta, ORA, Volvo, BMW, Mercedes พร้อมรับประกัน 4 ปี และบริการเปลี่ยนถึงบ้าน (On-site) ครับ ลูกค้าใช้รถรุ่นไหนครับ?",
    tags: ["product", "battery", "recommendation"],
  },
  {
    id: 1002,
    triggers: ["มอเตอร์ไซค์", "มอไซค์", "motorcycle", "EM", "มอเตอร์ไซค์ไฟฟ้า", "จักรยานยนต์ไฟฟ้า"],
    customerExample: "มอเตอร์ไซค์ไฟฟ้า EM",
    adminReply:
      "EV Life Thailand เป็นตัวแทนจำหน่ายมอเตอร์ไซค์ไฟฟ้า EM อย่างเป็นทางการ มีหลายรุ่นให้เลือก เช่น EM Qarez / EM Legend / EM Milano / EM Owen Long Range / EM Legend Pro / EM Enzo ลูกค้าสนใจรุ่นไหน หรือต้องการให้แนะนำตามการใช้งานครับ?",
    tags: ["product", "motorcycle", "EM"],
  },
  {
    id: 1003,
    triggers: ["ผ่อน", "ไม่มีบัตรเครดิต", "ผ่อนแต่ไม่มีบัตร", "installment without credit card"],
    customerExample: "ผมอยากผ่อน แต่ไม่มีบัตรเครดิตครับ",
    adminReply:
      "สำหรับมอเตอร์ไซค์ไฟฟ้า EM สามารถผ่อนผ่านบัตรเครดิตได้ครับ หากไม่มีบัตรเครดิต สามารถชำระเต็มจำนวนผ่านการโอนเงินได้ครับ สำหรับแบตเตอรี่ 12V ชำระเต็มจำนวนครับ",
    tags: ["payment", "installment"],
  },
  {
    id: 1004,
    triggers: ["on-site", "ออนไซต์", "ถึงบ้าน", "เปลี่ยนถึงที่", "มาเปลี่ยนให้"],
    customerExample: "มีบริการเปลี่ยนถึงบ้านไหม",
    adminReply:
      "มีครับ! EV Life Thailand มีบริการ On-site เปลี่ยนแบตเตอรี่ถึงบ้านหรือที่ทำงาน กรุงเทพฯ-ปริมณฑล ฟรีค่าบริการเดินทาง ใช้เวลาเปลี่ยนประมาณ 30-60 นาที ต่างจังหวัดมีค่าบริการเพิ่มเติมครับ",
    tags: ["service", "on-site"],
  },
  {
    id: 1005,
    triggers: ["ปลายทาง", "COD", "เก็บเงินปลายทาง", "cash on delivery"],
    customerExample: "มีชำระปลายทางไหม",
    adminReply:
      "สำหรับบริการ On-site สามารถชำระเงินสดหรือโอนเงินตอนช่างไปถึงได้ครับ แต่สำหรับการจัดส่งทางขนส่ง ต้องชำระก่อนจัดส่งครับ",
    tags: ["payment", "cod"],
  },
  {
    id: 1006,
    triggers: ["shopee", "lazada", "ช้อปปี้", "ลาซาด้า"],
    customerExample: "มีขายบน Shopee หรือ Lazada ไหม",
    adminReply:
      "ขณะนี้สินค้าจำหน่ายผ่านช่องทาง LINE @evlifethailand และ Facebook Page: EV Life Thailand เท่านั้นครับ เพื่อให้บริการหลังการขายและรับประกันได้อย่างเต็มที่ครับ",
    tags: ["channel", "marketplace"],
  },
  {
    id: 1007,
    triggers: ["จดทะเบียน", "ทะเบียน", "พรบ", "พ.ร.บ."],
    customerExample: "มอเตอร์ไซค์ EM จดทะเบียนได้ไหม",
    adminReply:
      "มอเตอร์ไซค์ไฟฟ้า EM จดทะเบียนได้ตามกฎหมายไทยครับ ได้รับการรับรองจาก มอก. ทางร้านมีบริการช่วยดำเนินการจดทะเบียนให้ด้วยครับ",
    tags: ["registration", "legal"],
  },
];

export function matchSaleScript(message: string): SaleScript | undefined {
  const lower = message.toLowerCase();
  return saleScripts.find((s) =>
    s.triggers.some((t) => lower.includes(t.toLowerCase()))
  );
}
