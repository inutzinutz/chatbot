export interface SaleScript {
  id: number;
  triggers: string[];
  customerExample: string;
  adminReply: string;
  tags: string[];
}

export const saleScripts: SaleScript[] = [
  {
    id: 1173,
    triggers: ["โดรน", "drone", "มีโดรน", "แนะนำโดรน"],
    customerExample: "โดรน",
    adminReply:
      "ทางร้าน DJI 13 STORE มีโดรนหลายรุ่นให้เลือก ทั้งสำหรับผู้เริ่มต้นและระดับมืออาชีพ เช่น DJI Mini 4K / DJI NEO 2 / DJI Flip / DJI Mini 5 Pro / DJI Mavic 4 Pro ลูกค้าสนใจโดรนรุ่นไหนครับ?",
    tags: ["product", "drone", "recommendation"],
  },
  {
    id: 1165,
    triggers: [
      "ผ่อน",
      "ไม่มีบัตรเครดิต",
      "ผ่อนแต่ไม่มีบัตร",
      "installment without credit card",
    ],
    customerExample: "ผมอยากผ่อน แต่ไม่มีบัตรเครดิตครับ",
    adminReply:
      "ขออภัยครับ ขณะนี้เงื่อนไขการผ่อนชำระของทางร้านกำหนดให้ต้องใช้บัตรเครดิตในการทำรายการเท่านั้นครับ หรือสามารถโอนชำระเงินสดเต็มจำนวนได้ครับ",
    tags: ["payment", "installment"],
  },
  {
    id: 1164,
    triggers: ["deposit", "มัดจำ", "วางมัดจำ"],
    customerExample: "มี deposit/มัดจำ ไหม",
    adminReply:
      "ไม่มีครับ สำหรับสินค้าทั่วไปไม่ต้องมีเงินมัดจำ สามารถชำระเต็มจำนวนหรือผ่อน 0% ได้ทันทีหลังยืนยันสั่งซื้อครับ",
    tags: ["payment", "deposit"],
  },
  {
    id: 1163,
    triggers: ["จ่ายมัดจำ", "มัดจำก่อนได้ไหม", "deposit first"],
    customerExample: "จ่ายมัดจำก่อนได้ไหม",
    adminReply:
      "ขออภัยครับ ทางร้านไม่รับการชำระมัดจำล่วงหน้าสำหรับสินค้าที่มีในสต็อกครับ หากสินค้าหมด หรือเป็นรายการ Pre-order เราจะแจ้งให้ทราบเป็นกรณีพิเศษครับ",
    tags: ["payment", "deposit", "preorder"],
  },
  {
    id: 1162,
    triggers: ["วางดาวน์", "ดาวน์เท่าไหร่", "down payment"],
    customerExample: "วางดาวน์เท่าไหร่ครับ",
    adminReply:
      "ทางร้าน DJI 13 STORE ไม่มีระบบวางเงินดาวน์สำหรับสินค้าทั่วไปครับ ลูกค้าสามารถเลือกชำระเต็มจำนวนผ่านการโอนเงิน หรือผ่อน 0% ผ่านบัตรเครดิตได้ทันทีครับ",
    tags: ["payment", "down_payment"],
  },
  {
    id: 1123,
    triggers: ["shopee", "ขายในช้อปปี้", "Shopee"],
    customerExample: "Are drones sold on Shopee?",
    adminReply:
      "This announcement is not currently available on Shopee due to legal issues. Please notify us before delivery.",
    tags: ["channel", "shopee"],
  },
  {
    id: 1096,
    triggers: ["ปลายทาง", "COD", "เก็บเงินปลายทาง", "cash on delivery"],
    customerExample: "มีชำระปลายทางไหม",
    adminReply:
      "สำหรับการชำระเงินปลายทาง ขอแจ้งว่าทางร้านไม่สามารถรับชำระเงินแบบ Cash on Delivery (COD) ได้ครับ",
    tags: ["payment", "cod"],
  },
];

export function matchSaleScript(message: string): SaleScript | undefined {
  const lower = message.toLowerCase();
  return saleScripts.find((s) =>
    s.triggers.some((t) => lower.includes(t.toLowerCase()))
  );
}
