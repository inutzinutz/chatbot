/* ------------------------------------------------------------------ */
/*  Support @ DJI 13 Store — Service & Repair Products/Services Catalog */
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

  // === บริการซ่อมโดรน DJI ===

  {
    id: 5001,
    name: "บริการซ่อมโดรน DJI — ตรวจสอบและประเมินราคา",
    description: "บริการตรวจสอบโดรน DJI ทุกรุ่น วินิจฉัยอาการเสีย ประเมินค่าซ่อมก่อนดำเนินการ ฟรีค่าประเมิน ใช้เวลา 1-2 วันทำการ\nNote: ฟรีค่าประเมินเบื้องต้น | ค่าซ่อมแจ้งก่อนดำเนินการ",
    price: 0,
    category: "บริการซ่อม",
    image: "https://placehold.co/300x300/3b82f6/white?text=Diagnosis",
    tags: ["ซ่อม", "ประเมิน", "diagnosis", "วินิจฉัย", "ตรวจสอบ", "repair", "DJI"],
    status: "active",
  },
  {
    id: 5002,
    name: "ซ่อมโดรน DJI — เปลี่ยนใบพัด (Propeller)",
    description: "เปลี่ยนใบพัดโดรน DJI ทุกรุ่น ใช้อะไหล่แท้หรืออะไหล่คุณภาพเทียบเท่า ราคาเริ่มต้น 300 บาท (ไม่รวมค่าอะไหล่)\nRepair Time: 30-60 นาที",
    price: 300,
    category: "บริการซ่อม",
    image: "https://placehold.co/300x300/3b82f6/white?text=Propeller",
    tags: ["ใบพัด", "propeller", "เปลี่ยนใบพัด", "ซ่อม", "DJI", "อะไหล่"],
    status: "active",
  },
  {
    id: 5003,
    name: "ซ่อมโดรน DJI — เปลี่ยนมอเตอร์",
    description: "เปลี่ยนมอเตอร์โดรน DJI ทุกรุ่น ราคาเริ่มต้น 800 บาท (ไม่รวมค่าอะไหล่) ใช้เวลา 1-2 ชั่วโมง\nRepair Time: 1-2 ชั่วโมง",
    price: 800,
    category: "บริการซ่อม",
    image: "https://placehold.co/300x300/3b82f6/white?text=Motor",
    tags: ["มอเตอร์", "motor", "เปลี่ยนมอเตอร์", "ซ่อม", "DJI", "อะไหล่"],
    status: "active",
  },
  {
    id: 5004,
    name: "ซ่อมโดรน DJI — เปลี่ยน Gimbal / กล้อง",
    description: "ซ่อมหรือเปลี่ยน Gimbal และกล้องโดรน DJI ราคาเริ่มต้น 1,500 บาท (ไม่รวมค่าอะไหล่) ใช้เวลา 1-3 วันทำการ\nRepair Time: 1-3 วันทำการ",
    price: 1500,
    category: "บริการซ่อม",
    image: "https://placehold.co/300x300/3b82f6/white?text=Gimbal",
    tags: ["gimbal", "กิมบอล", "กล้อง", "camera", "เปลี่ยน", "ซ่อม", "DJI"],
    status: "active",
  },
  {
    id: 5005,
    name: "ซ่อมโดรน DJI — ซ่อมบอร์ดหลัก (ESC / Flight Controller)",
    description: "ซ่อมบอร์ดอิเล็กทรอนิกส์ ESC, Flight Controller ของโดรน DJI ราคาเริ่มต้น 2,000 บาท\nRepair Time: 3-7 วันทำการ",
    price: 2000,
    category: "บริการซ่อม",
    image: "https://placehold.co/300x300/3b82f6/white?text=Board",
    tags: ["บอร์ด", "ESC", "flight controller", "อิเล็กทรอนิกส์", "ซ่อมบอร์ด", "DJI"],
    status: "active",
  },
  {
    id: 5006,
    name: "ซ่อมโดรน DJI — ซ่อมระบบ Vision / Obstacle Sensing",
    description: "ซ่อมระบบเซ็นเซอร์ Vision, Obstacle Avoidance ของโดรน DJI ราคาเริ่มต้น 1,200 บาท\nRepair Time: 1-3 วันทำการ",
    price: 1200,
    category: "บริการซ่อม",
    image: "https://placehold.co/300x300/3b82f6/white?text=Vision",
    tags: ["vision", "sensor", "เซ็นเซอร์", "obstacle", "ซ่อม", "DJI"],
    status: "active",
  },
  {
    id: 5007,
    name: "ซ่อมโดรน DJI — เปลี่ยนแบตเตอรี่ / ซ่อมระบบชาร์จ",
    description: "เปลี่ยนแบตเตอรี่โดรน DJI หรือซ่อมระบบชาร์จ ราคาเริ่มต้น 500 บาท (ไม่รวมค่าแบตเตอรี่)\nRepair Time: 30-60 นาที",
    price: 500,
    category: "บริการซ่อม",
    image: "https://placehold.co/300x300/3b82f6/white?text=Battery",
    tags: ["แบตเตอรี่", "battery", "ชาร์จ", "charge", "เปลี่ยน", "ซ่อม", "DJI"],
    status: "active",
  },
  {
    id: 5008,
    name: "ซ่อมโดรน DJI — เคาะ/พ่นสี Shell ตัวถัง",
    description: "ซ่อมตัวถังโดรน DJI ที่แตก บิ่น หรือสีลอก เปลี่ยน Shell ราคาเริ่มต้น 600 บาท\nRepair Time: 1-2 วันทำการ",
    price: 600,
    category: "บริการซ่อม",
    image: "https://placehold.co/300x300/3b82f6/white?text=Shell",
    tags: ["shell", "ตัวถัง", "แตก", "บิ่น", "เปลี่ยน", "ซ่อม", "DJI"],
    status: "active",
  },

  // === บริการเคลม DJI Care Refresh ===

  {
    id: 5101,
    name: "DJI Care Refresh — ดำเนินการเคลม",
    description: "บริการช่วยดำเนินการเคลม DJI Care Refresh แทนลูกค้า ตรวจสอบสิทธิ์ ยื่นเอกสาร ส่งโดรนไป DJI Service Center อย่างเป็นทางการ\nNote: ลูกค้าต้องมี DJI Care Refresh ที่ยังไม่หมดอายุ",
    price: 0,
    category: "เคลมประกัน",
    image: "https://placehold.co/300x300/8b5cf6/white?text=DJI+Care",
    tags: ["care refresh", "เคลม", "ประกัน", "DJI Care", "claim", "insurance"],
    status: "active",
  },
  {
    id: 5102,
    name: "DJI Care Refresh — ต่ออายุประกัน",
    description: "บริการต่ออายุ DJI Care Refresh สำหรับโดรน DJI ทุกรุ่นที่รองรับ ราคาขึ้นอยู่กับรุ่น\nNote: ต้องต่ออายุก่อนวันหมดอายุ",
    price: 0,
    category: "เคลมประกัน",
    image: "https://placehold.co/300x300/8b5cf6/white?text=Care+Renew",
    tags: ["care refresh", "ต่ออายุ", "renew", "ประกัน", "DJI", "insurance"],
    status: "active",
  },
  {
    id: 5103,
    name: "DJI Care Refresh — เคลมอุบัติเหตุ (Flyaway / Crash)",
    description: "บริการเคลมกรณีโดรนชน ตกน้ำ สูญหาย (Flyaway) ผ่าน DJI Care Refresh Plus ตรวจสอบสิทธิ์และช่วยยื่นเรื่อง\nNote: ขึ้นอยู่กับประเภทแพ็กเกจ Care Refresh",
    price: 0,
    category: "เคลมประกัน",
    image: "https://placehold.co/300x300/8b5cf6/white?text=Flyaway",
    tags: ["flyaway", "ตกน้ำ", "ชน", "crash", "เคลม", "care refresh", "DJI"],
    status: "active",
  },

  // === อะไหล่และอุปกรณ์เสริม ===

  {
    id: 5201,
    name: "อะไหล่โดรน DJI — ใบพัด (Propeller) แท้",
    description: "ใบพัดแท้จาก DJI สำหรับโดรนทุกรุ่น Mini, Air, Mavic, Avata, Phantom ราคาเริ่มต้น 350 บาท/คู่",
    price: 350,
    category: "อะไหล่",
    image: "https://placehold.co/300x300/10b981/white?text=Propeller+OEM",
    tags: ["อะไหล่", "ใบพัด", "propeller", "แท้", "OEM", "DJI", "mini", "air", "mavic"],
    status: "active",
  },
  {
    id: 5202,
    name: "อะไหล่โดรน DJI — มอเตอร์แท้",
    description: "มอเตอร์แท้จาก DJI สำหรับโดรนทุกรุ่น ราคาเริ่มต้น 1,200 บาท/ตัว",
    price: 1200,
    category: "อะไหล่",
    image: "https://placehold.co/300x300/10b981/white?text=Motor+OEM",
    tags: ["อะไหล่", "มอเตอร์", "motor", "แท้", "OEM", "DJI"],
    status: "active",
  },
  {
    id: 5203,
    name: "อะไหล่โดรน DJI — แบตเตอรี่แท้",
    description: "แบตเตอรี่แท้จาก DJI สำหรับโดรนทุกรุ่น ราคาเริ่มต้น 1,800 บาท",
    price: 1800,
    category: "อะไหล่",
    image: "https://placehold.co/300x300/10b981/white?text=Battery+OEM",
    tags: ["อะไหล่", "แบตเตอรี่", "battery", "แท้", "OEM", "DJI"],
    status: "active",
  },
  {
    id: 5204,
    name: "อะไหล่โดรน DJI — Shell / ฝาครอบตัวถัง",
    description: "Shell ตัวถังสำหรับโดรน DJI Mini / Air / Mavic ราคาเริ่มต้น 450 บาท",
    price: 450,
    category: "อะไหล่",
    image: "https://placehold.co/300x300/10b981/white?text=Shell+OEM",
    tags: ["อะไหล่", "shell", "ตัวถัง", "ฝาครอบ", "DJI"],
    status: "active",
  },

  // === บริการทดสอบและอัปเดต ===

  {
    id: 5301,
    name: "บริการอัปเดต Firmware โดรน DJI",
    description: "บริการอัปเดต Firmware โดรน DJI และอุปกรณ์เสริม ให้ระบบทำงานถูกต้อง ลดปัญหา Bug ฟรีค่าบริการ (ต้องนำมาที่ร้าน)\nService Time: 30-60 นาที",
    price: 0,
    category: "บริการทดสอบ",
    image: "https://placehold.co/300x300/f59e0b/white?text=Firmware",
    tags: ["firmware", "อัปเดต", "update", "ซอฟต์แวร์", "DJI"],
    status: "active",
  },
  {
    id: 5302,
    name: "บริการ Calibration — Gimbal / Compass / IMU",
    description: "บริการ Calibrate Gimbal, Compass, IMU ของโดรน DJI ให้ทำงานถูกต้อง ฟรีค่าบริการ (ต้องนำมาที่ร้าน)\nService Time: 30-60 นาที",
    price: 0,
    category: "บริการทดสอบ",
    image: "https://placehold.co/300x300/f59e0b/white?text=Calibration",
    tags: ["calibration", "สอบเทียบ", "gimbal", "compass", "imu", "DJI"],
    status: "active",
  },
  {
    id: 5303,
    name: "บริการตรวจ Flight Log — วิเคราะห์อาการโดรน",
    description: "บริการอ่านและวิเคราะห์ Flight Log ของโดรน DJI เพื่อวินิจฉัยอาการผิดปกติ หาสาเหตุการตก การสูญเสียสัญญาณ ฯลฯ ราคา 300 บาท\nService Time: 1-2 ชั่วโมง",
    price: 300,
    category: "บริการทดสอบ",
    image: "https://placehold.co/300x300/f59e0b/white?text=FlightLog",
    tags: ["flight log", "log analysis", "วิเคราะห์", "วินิจฉัย", "DJI", "ตก", "สัญญาณ"],
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
