/* ------------------------------------------------------------------ */
/*  ทีมเอกสาร DJI 13 Store — Document & Registration Services Catalog */
/* ------------------------------------------------------------------ */

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  tags: string[];
  status?: "active" | "discontinue";
  recommendedAlternative?: string;
}

export const products: Product[] = [

  // === บริการขึ้นทะเบียน กสทช. ===

  {
    id: 6001,
    name: "ขึ้นทะเบียนโดรน กสทช. — บริการดำเนินการแทน",
    description: "บริการขึ้นทะเบียนโดรนกับ กสทช. แทนลูกค้าครบวงจร รับเอกสาร กรอกแบบฟอร์ม ยื่น ติดตามผล และส่ง QR Code ให้เมื่อสำเร็จ\nNote: ค่าธรรมเนียม กสทช. ฟรี | มีค่าบริการดำเนินการ สอบถามราคา",
    price: 0,
    category: "กสทช.",
    image: "https://placehold.co/300x300/6366f1/white?text=NBTC+Reg",
    tags: ["กสทช.", "ขึ้นทะเบียน", "register", "nbtc", "โดรน", "DJI"],
    status: "active",
  },
  {
    id: 6002,
    name: "ชุดเตรียมเอกสารขึ้นทะเบียน กสทช. (DIY)",
    description: "บริการแนะนำและตรวจสอบเอกสารก่อนยื่น กสทช. ด้วยตัวเอง ทีมช่วยตรวจสอบความถูกต้องก่อนยื่น ลดโอกาสเอกสารไม่ผ่าน\nService Time: 1 วันทำการ",
    price: 0,
    category: "กสทช.",
    image: "https://placehold.co/300x300/6366f1/white?text=NBTC+Docs",
    tags: ["กสทช.", "เอกสาร", "document", "ตรวจสอบ", "DIY"],
    status: "active",
  },

  // === บริการ CAAT ===

  {
    id: 6101,
    name: "จัดเตรียมเอกสารขอ RPL (Remote Pilot License)",
    description: "บริการจัดเตรียมและตรวจสอบเอกสารสำหรับการขอใบอนุญาตนักบินโดรน RPL จาก CAAT ครบวงจร แนะนำ FTO ที่เหมาะสม\nNote: ไม่รวมค่าอบรมและค่าธรรมเนียม CAAT",
    price: 0,
    category: "CAAT",
    image: "https://placehold.co/300x300/6366f1/white?text=RPL+Docs",
    tags: ["caat", "rpl", "ใบอนุญาต", "นักบิน", "โดรน", "เอกสาร"],
    status: "active",
  },
  {
    id: 6102,
    name: "ปรึกษากฎหมายการบินโดรน (1 ชั่วโมง)",
    description: "บริการให้คำปรึกษาเรื่องกฎหมายการบินโดรนในไทย กสทช. CAAT พื้นที่หวงห้าม ข้อกำหนดต่างๆ โดยผู้เชี่ยวชาญ\nService Time: 1 ชั่วโมง (Online/Line Call)",
    price: 0,
    category: "CAAT",
    image: "https://placehold.co/300x300/6366f1/white?text=Consult",
    tags: ["ปรึกษา", "กฎหมาย", "caat", "กสทช.", "regulation", "consult"],
    status: "active",
  },
  {
    id: 6103,
    name: "ต่ออายุใบอนุญาต RPL — บริการดำเนินการแทน",
    description: "บริการต่ออายุใบอนุญาตนักบินโดรน RPL แทนลูกค้า จัดเตรียมเอกสาร ยื่น CAAT และติดตามผล\nNote: RPL มีอายุ 2 ปี ควรดำเนินการก่อนหมดอายุ 90 วัน",
    price: 0,
    category: "CAAT",
    image: "https://placehold.co/300x300/6366f1/white?text=RPL+Renew",
    tags: ["ต่ออายุ", "renew", "rpl", "caat", "ใบอนุญาต"],
    status: "active",
  },

  // === บริการเอกสารอื่นๆ ===

  {
    id: 6201,
    name: "ตรวจสอบ No-Fly Zone และขออนุญาตบินพื้นที่พิเศษ",
    description: "บริการตรวจสอบพื้นที่บินและขออนุญาตบินในพื้นที่ควบคุมพิเศษ เช่น ใกล้สนามบิน พื้นที่ราชการ สวนสาธารณะ ฯลฯ\nNote: ระยะเวลาขึ้นอยู่กับหน่วยงานที่รับผิดชอบ",
    price: 0,
    category: "อนุญาตบิน",
    image: "https://placehold.co/300x300/6366f1/white?text=No+Fly",
    tags: ["no fly zone", "พื้นที่ห้ามบิน", "อนุญาตบิน", "สนามบิน", "ขออนุญาต"],
    status: "active",
  },
];

export function searchProducts(query: string): Product[] {
  const lowerQuery = query.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery) ||
      p.tags.some((t) => t.toLowerCase().includes(lowerQuery))
  );
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter(
    (p) => p.category.toLowerCase() === category.toLowerCase()
  );
}

export function getProductById(id: number): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getCategories(): string[] {
  return [...new Set(products.map((p) => p.category))];
}

export function getActiveProducts(): Product[] {
  return products.filter((p) => p.status !== "discontinue");
}

export function getDiscontinuedProducts(): Product[] {
  return products.filter((p) => p.status === "discontinue");
}

export function getProductsByPriceRange(min: number, max: number): Product[] {
  return products.filter(
    (p) => p.price >= min && p.price <= max && p.status !== "discontinue"
  );
}

export function getCheapestProducts(limit: number = 5): Product[] {
  return getActiveProducts()
    .sort((a, b) => a.price - b.price)
    .slice(0, limit);
}
