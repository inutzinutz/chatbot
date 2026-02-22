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
  // === แบตเตอรี่ LiFePO4 12V สำหรับรถยนต์ไฟฟ้า ===

  // -- BYD --
  {
    id: 1001,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ BYD Atto 3",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ BYD Atto 3 ทดแทนแบตเตอรี่เดิมจากโรงงาน ช่วยแก้ปัญหาแบตหมด ระบบค้าง เปิดรถไม่ติด รับประกัน 4 ปี พร้อมบริการติดตั้ง On-site ถึงบ้าน\nWarranty: 4 ปี",
    price: 5900,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/f97316/white?text=BYD+Atto3",
    tags: ["แบตเตอรี่", "LiFePO4", "BYD", "Atto 3", "12V", "auxiliary battery", "รถยนต์ไฟฟ้า"],
    status: "active",
  },
  {
    id: 1002,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ BYD Dolphin",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ BYD Dolphin ทดแทนแบตเตอรี่เดิม ป้องกันปัญหาแบตเสื่อม ระบบไฟฟ้าค้าง รับประกัน 4 ปี พร้อมบริการ On-site\nWarranty: 4 ปี",
    price: 5900,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/f97316/white?text=BYD+Dolphin",
    tags: ["แบตเตอรี่", "LiFePO4", "BYD", "Dolphin", "12V", "auxiliary battery"],
    status: "active",
  },
  {
    id: 1003,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ BYD Seal",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ BYD Seal ทดแทนแบตเตอรี่เดิม แก้ปัญหาระบบ 12V เสื่อม รับประกัน 4 ปี\nWarranty: 4 ปี",
    price: 5900,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/f97316/white?text=BYD+Seal",
    tags: ["แบตเตอรี่", "LiFePO4", "BYD", "Seal", "12V", "auxiliary battery"],
    status: "active",
  },
  {
    id: 1004,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ BYD Sealion 6",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ BYD Sealion 6 รับประกัน 4 ปี พร้อมบริการ On-site ถึงบ้าน\nWarranty: 4 ปี",
    price: 5900,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/f97316/white?text=BYD+Sealion6",
    tags: ["แบตเตอรี่", "LiFePO4", "BYD", "Sealion 6", "12V", "auxiliary battery"],
    status: "active",
  },
  {
    id: 1005,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ BYD Sealion 7",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ BYD Sealion 7 รับประกัน 4 ปี\nWarranty: 4 ปี",
    price: 5900,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/f97316/white?text=BYD+Sealion7",
    tags: ["แบตเตอรี่", "LiFePO4", "BYD", "Sealion 7", "12V", "auxiliary battery"],
    status: "active",
  },

  // -- Tesla --
  {
    id: 1010,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ Tesla Model 3",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ Tesla Model 3 ทุกรุ่นปี แก้ปัญหาแบต 12V เสื่อม ระบบเตือน 12V Low รับประกัน 4 ปี\nWarranty: 4 ปี",
    price: 6500,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/ef4444/white?text=Tesla+M3",
    tags: ["แบตเตอรี่", "LiFePO4", "Tesla", "Model 3", "12V", "auxiliary battery"],
    status: "active",
  },
  {
    id: 1011,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ Tesla Model Y",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ Tesla Model Y ทุกรุ่นปี แก้ปัญหาแบต 12V เสื่อม รับประกัน 4 ปี\nWarranty: 4 ปี",
    price: 6500,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/ef4444/white?text=Tesla+MY",
    tags: ["แบตเตอรี่", "LiFePO4", "Tesla", "Model Y", "12V", "auxiliary battery"],
    status: "active",
  },
  {
    id: 1012,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ Tesla Model S",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ Tesla Model S รับประกัน 4 ปี\nWarranty: 4 ปี",
    price: 7500,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/ef4444/white?text=Tesla+MS",
    tags: ["แบตเตอรี่", "LiFePO4", "Tesla", "Model S", "12V", "auxiliary battery"],
    status: "active",
  },

  // -- MG --
  {
    id: 1020,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ MG ZS EV",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ MG ZS EV ทุกรุ่นปี รับประกัน 4 ปี พร้อมบริการ On-site\nWarranty: 4 ปี",
    price: 5500,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/10b981/white?text=MG+ZS+EV",
    tags: ["แบตเตอรี่", "LiFePO4", "MG", "ZS EV", "12V", "auxiliary battery"],
    status: "active",
  },
  {
    id: 1021,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ MG MG4 Electric",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ MG4 Electric รับประกัน 4 ปี\nWarranty: 4 ปี",
    price: 5500,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/10b981/white?text=MG4+Electric",
    tags: ["แบตเตอรี่", "LiFePO4", "MG", "MG4", "Electric", "12V", "auxiliary battery"],
    status: "active",
  },

  // -- Neta --
  {
    id: 1030,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ Neta V",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ Neta V แก้ปัญหาแบตหมด ระบบค้าง รับประกัน 4 ปี\nWarranty: 4 ปี",
    price: 4900,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/6366f1/white?text=Neta+V",
    tags: ["แบตเตอรี่", "LiFePO4", "Neta", "Neta V", "12V", "auxiliary battery"],
    status: "active",
  },
  {
    id: 1031,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ Neta X",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ Neta X รับประกัน 4 ปี\nWarranty: 4 ปี",
    price: 5500,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/6366f1/white?text=Neta+X",
    tags: ["แบตเตอรี่", "LiFePO4", "Neta", "Neta X", "12V", "auxiliary battery"],
    status: "active",
  },

  // -- ORA --
  {
    id: 1040,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ ORA Good Cat",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ ORA Good Cat ทุกรุ่น รับประกัน 4 ปี พร้อมบริการ On-site\nWarranty: 4 ปี",
    price: 5500,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/ec4899/white?text=ORA+GoodCat",
    tags: ["แบตเตอรี่", "LiFePO4", "ORA", "Good Cat", "12V", "auxiliary battery"],
    status: "active",
  },

  // -- Volvo --
  {
    id: 1050,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ Volvo EX30",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ Volvo EX30 รับประกัน 4 ปี\nWarranty: 4 ปี",
    price: 6500,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/0ea5e9/white?text=Volvo+EX30",
    tags: ["แบตเตอรี่", "LiFePO4", "Volvo", "EX30", "12V", "auxiliary battery"],
    status: "active",
  },
  {
    id: 1051,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ Volvo XC40 Recharge",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ Volvo XC40 Recharge รับประกัน 4 ปี\nWarranty: 4 ปี",
    price: 6500,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/0ea5e9/white?text=Volvo+XC40",
    tags: ["แบตเตอรี่", "LiFePO4", "Volvo", "XC40", "Recharge", "12V", "auxiliary battery"],
    status: "active",
  },

  // -- BMW --
  {
    id: 1060,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ BMW iX3",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ BMW iX3 รับประกัน 4 ปี\nWarranty: 4 ปี",
    price: 7500,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/1e40af/white?text=BMW+iX3",
    tags: ["แบตเตอรี่", "LiFePO4", "BMW", "iX3", "12V", "auxiliary battery"],
    status: "active",
  },

  // -- Mercedes-Benz --
  {
    id: 1070,
    name: "แบตเตอรี่ LiFePO4 12V สำหรับ Mercedes EQA",
    description: "แบตเตอรี่ LiFePO4 12V Auxiliary Battery สำหรับ Mercedes-Benz EQA รับประกัน 4 ปี\nWarranty: 4 ปี",
    price: 7500,
    category: "แบตเตอรี่ EV",
    image: "https://placehold.co/300x300/374151/white?text=Mercedes+EQA",
    tags: ["แบตเตอรี่", "LiFePO4", "Mercedes", "EQA", "12V", "auxiliary battery"],
    status: "active",
  },

  // === บริการ On-site ===
  {
    id: 2001,
    name: "บริการเปลี่ยนแบตเตอรี่ On-site กรุงเทพฯ และปริมณฑล",
    description: "บริการเปลี่ยนแบตเตอรี่ถึงบ้านหรือที่ทำงาน กรุงเทพฯ และปริมณฑล (นนทบุรี ปทุมธานี สมุทรปราการ) ช่างผู้เชี่ยวชาญเดินทางไปถึง พร้อมเครื่องมือครบชุด ใช้เวลาเปลี่ยนประมาณ 30-60 นาที\nService Time: 30-60 นาที",
    price: 0,
    category: "บริการ",
    image: "https://placehold.co/300x300/f97316/white?text=On-site+BKK",
    tags: ["on-site", "บริการ", "เปลี่ยนแบตเตอรี่", "กรุงเทพ", "ปริมณฑล", "ถึงบ้าน"],
    status: "active",
  },
  {
    id: 2002,
    name: "บริการเปลี่ยนแบตเตอรี่ On-site ต่างจังหวัด",
    description: "บริการเปลี่ยนแบตเตอรี่ถึงที่สำหรับลูกค้าต่างจังหวัด มีค่าบริการเพิ่มเติมตามระยะทาง กรุณาติดต่อสอบถามราคาล่วงหน้า\nService Time: นัดหมายล่วงหน้า 2-3 วัน",
    price: 500,
    category: "บริการ",
    image: "https://placehold.co/300x300/f97316/white?text=On-site+Provincial",
    tags: ["on-site", "บริการ", "เปลี่ยนแบตเตอรี่", "ต่างจังหวัด"],
    status: "active",
  },

  // === มอเตอร์ไซค์ไฟฟ้า EM (6 รุ่น — ข้อมูลถูกต้อง ณ ก.พ. 2568) ===
  {
    id: 3005,
    name: "EM Qarez",
    description: "มอเตอร์ไซค์ไฟฟ้า EM Qarez สไตล์ Urban Fashion ไฟหน้า RGB เปลี่ยนสีได้ Cruise Control ราคาประหยัดที่สุดในตระกูล EM จดทะเบียนได้ พร้อมส่งครบสี\nMotor: 2000W | Battery: 72V 24Ah | Range: 50-75 km | Top Speed: 60-70 km/h | Charge: 2-4 h\nWarranty: มอเตอร์ 5 ปี/30,000 กม. | แบตเตอรี่คอนโทรลเลอร์ 3 ปี/20,000 กม. | ระบบไฟฟ้า 1 ปี/10,000 กม.",
    price: 38900,
    category: "มอเตอร์ไซค์ไฟฟ้า EM",
    image: "https://placehold.co/300x300/06b6d4/white?text=EM+Qarez",
    tags: ["มอเตอร์ไซค์ไฟฟ้า", "EM", "Qarez", "Urban", "RGB", "จดทะเบียนได้"],
    status: "discontinue",
    recommendedAlternative: "EM Legend G.2",
  },
  {
    id: 3006,
    name: "EM Legend G.2",
    description: "มอเตอร์ไซค์ไฟฟ้า EM Legend G.2 รุ่นยอดนิยม คุ้มค่าที่สุด NO.1 EV Bike of the Year 2025 จดทะเบียนได้ พร้อมส่งครบสี\nMotor: 2000W | Battery: 72V 32Ah | Range: 80 km | Top Speed: 70 km/h | Charge: 4-6 h\nWarranty: มอเตอร์ 5 ปี/30,000 กม. | แบตเตอรี่คอนโทรลเลอร์ 3 ปี/20,000 กม. | ระบบไฟฟ้า 1 ปี/10,000 กม.",
    price: 39900,
    category: "มอเตอร์ไซค์ไฟฟ้า EM",
    image: "https://placehold.co/300x300/d946ef/white?text=EM+Legend+G.2",
    tags: ["มอเตอร์ไซค์ไฟฟ้า", "EM", "Legend", "Legend G.2", "G.2", "จดทะเบียนได้", "พร้อมส่ง", "คุ้มค่า", "EV Bike of the Year"],
    status: "active",
  },
  {
    id: 3002,
    name: "EM Legend Pro",
    description: "มอเตอร์ไซค์ไฟฟ้า EM Legend Pro รุ่นอัปเกรด โช้ค YSS คุณภาพสูง สมรรถนะดีขึ้น จดทะเบียนได้ พร้อมส่งครบสี\nMotor: 2500W | Battery: 72V 40Ah | Range: 80 km | Top Speed: 75 km/h | Charge: 5-7 h\nWarranty: มอเตอร์ 5 ปี/30,000 กม. | แบตเตอรี่คอนโทรลเลอร์ 3 ปี/20,000 กม. | ระบบไฟฟ้า 1 ปี/10,000 กม.\nของแถมพิเศษ: กระเป๋าเกะหน้า",
    price: 49900,
    category: "มอเตอร์ไซค์ไฟฟ้า EM",
    image: "https://placehold.co/300x300/ef4444/white?text=EM+Legend+Pro",
    tags: ["มอเตอร์ไซค์ไฟฟ้า", "EM", "Legend Pro", "จดทะเบียนได้", "โช้ค YSS", "พร้อมส่ง"],
    status: "active",
  },
  {
    id: 3004,
    name: "EM Enzo",
    description: "มอเตอร์ไซค์ไฟฟ้า EM Enzo ดีไซน์เรโทรคลาสสิคสไตล์อิตาเลียน เร่ง 0-80 กม./ชม. ใน 3.5 วินาที พลังแรง จดทะเบียนได้ พร้อมส่งครบสี\nMotor: 3000W | Battery: 72V 44Ah | Range: 75-100 km | Top Speed: 75-80 km/h | Charge: 3-4 h (Quick Charge 2 h)\nWarranty: มอเตอร์ 5 ปี/30,000 กม. | แบตเตอรี่คอนโทรลเลอร์ 3 ปี/20,000 กม. | ระบบไฟฟ้า 1 ปี/10,000 กม.",
    price: 58900,
    category: "มอเตอร์ไซค์ไฟฟ้า EM",
    image: "https://placehold.co/300x300/8b5cf6/white?text=EM+Enzo",
    tags: ["มอเตอร์ไซค์ไฟฟ้า", "EM", "Enzo", "เรโทร", "อิตาเลียน", "จดทะเบียนได้"],
    status: "discontinue",
    recommendedAlternative: "EM Milano",
  },
  {
    id: 3001,
    name: "EM Milano",
    description: "มอเตอร์ไซค์ไฟฟ้า EM Milano พลังสูงสุดในตระกูล EM สไตล์สปอร์ตทันสมัย ดีไซน์พรีเมียม จดทะเบียนได้\nMotor: 4000W | Battery: 72V 60Ah | Range: 100 km | Top Speed: 85 km/h | Charge: 5-6 h\nWarranty: มอเตอร์ 5 ปี/30,000 กม. | แบตเตอรี่คอนโทรลเลอร์ 3 ปี/20,000 กม. | ระบบไฟฟ้า 1 ปี/10,000 กม.",
    price: 59900,
    category: "มอเตอร์ไซค์ไฟฟ้า EM",
    image: "https://placehold.co/300x300/f97316/white?text=EM+Milano",
    tags: ["มอเตอร์ไซค์ไฟฟ้า", "EM", "Milano", "จดทะเบียนได้", "สปอร์ต", "พลังสูง"],
    status: "active",
  },
  {
    id: 3003,
    name: "EM Owen Long Range",
    description: "มอเตอร์ไซค์ไฟฟ้า EM Owen Long Range เน้นระยะทางไกลที่สุดในซีรีส์ 200 กม./ชาร์จ เหมาะสำหรับขับทางไกลและต่างจังหวัด จดทะเบียนได้\nMotor: 3500W | Battery: 72V 80Ah | Range: 200 km | Top Speed: 85 km/h | Charge: 6-8 h\nWarranty: มอเตอร์ 5 ปี/30,000 กม. | แบตเตอรี่คอนโทรลเลอร์ 3 ปี/30,000 กม. | ระบบไฟฟ้า 1 ปี/10,000 กม.",
    price: 87200,
    category: "มอเตอร์ไซค์ไฟฟ้า EM",
    image: "https://placehold.co/300x300/10b981/white?text=EM+Owen+LR",
    tags: ["มอเตอร์ไซค์ไฟฟ้า", "EM", "Owen", "Owen LR", "Long Range", "ระยะทางไกล", "จดทะเบียนได้"],
    status: "active",
  },

  // === อุปกรณ์เสริม ===
  {
    id: 4001,
    name: "เครื่องชาร์จแบตเตอรี่ LiFePO4 12V Smart Charger",
    description: "เครื่องชาร์จอัจฉริยะสำหรับแบตเตอรี่ LiFePO4 12V ชาร์จอัตโนมัติ ตัดไฟเมื่อเต็ม ป้องกันชาร์จเกิน รองรับ 14.6V 5A",
    price: 1500,
    category: "อุปกรณ์เสริม",
    image: "https://placehold.co/300x300/a855f7/white?text=Smart+Charger",
    tags: ["เครื่องชาร์จ", "charger", "LiFePO4", "อุปกรณ์เสริม", "12V"],
    status: "active",
  },
  {
    id: 4002,
    name: "Battery Monitor / Battery Tester สำหรับรถ EV",
    description: "เครื่องวัดแรงดันและสุขภาพแบตเตอรี่ 12V สำหรับรถยนต์ไฟฟ้า แสดงผลแบบ Real-time ผ่านหน้าจอ LED ติดตั้งง่าย",
    price: 890,
    category: "อุปกรณ์เสริม",
    image: "https://placehold.co/300x300/14b8a6/white?text=Battery+Tester",
    tags: ["battery tester", "monitor", "วัดแบต", "อุปกรณ์เสริม", "EV"],
    status: "active",
  },
  {
    id: 4003,
    name: "สายชาร์จ Type 2 สำหรับรถยนต์ไฟฟ้า (Portable EV Charger)",
    description: "สายชาร์จ Portable EV Charger Type 2 ชาร์จได้ที่บ้านผ่านปลั๊กบ้าน 220V กำลัง 3.5kW ยาว 5 เมตร รองรับรถ EV ทุกยี่ห้อ",
    price: 12900,
    category: "อุปกรณ์เสริม",
    image: "https://placehold.co/300x300/3b82f6/white?text=EV+Charger",
    tags: ["สายชาร์จ", "EV charger", "Type 2", "portable", "อุปกรณ์เสริม"],
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
  return products.filter((p) => p.price >= min && p.price <= max && p.status !== "discontinue");
}

export function getCheapestProducts(limit: number = 5): Product[] {
  return getActiveProducts().sort((a, b) => a.price - b.price).slice(0, limit);
}
