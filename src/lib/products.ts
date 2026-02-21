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
  // === Action Cameras - DJI Action 2 Series (Discontinued) ===
  {
    id: 1559,
    name: "DJI Action 2 Dual-Screen Combo 128G",
    description: "DJI Action 2 Power Combo กล้อง 4K ที่กันน้ำได้ 10 เมตร มาพร้อมแบตเตอรี่ใช้งานยาวนาน 180 นาที\nBattery: 31 mins/charge",
    price: 9990,
    category: "Action Camera",
    image: "https://happy.dealdroid.net/uploads/products/202/j3dbjr9wun7fxwl8e6n5f3bo_small.jpg",
    tags: ["action camera", "DJI Action 2", "4K", "กันน้ำ", "128G", "dual screen"],
    status: "discontinue",
    recommendedAlternative: "Osmo Action 5 Pro",
  },
  {
    id: 1556,
    name: "DJI Action 2 Power Combo",
    description: "DJI Action 2 Power Combo กล้อง 4K ที่กันน้ำได้ 10 เมตร มาพร้อมแบตเตอรี่ใช้งานยาวนาน 180 นาที\nBattery: 31 mins/charge",
    price: 7990,
    category: "Action Camera",
    image: "https://happy.dealdroid.net/uploads/products/202/ondj8mriv6ds0l2do8f6jvjb_small.jpg",
    tags: ["action camera", "DJI Action 2", "4K", "กันน้ำ", "power combo"],
    status: "discontinue",
    recommendedAlternative: "Osmo Action 5 Pro",
  },
  {
    id: 1558,
    name: "DJI Action 2 Power Combo 128G",
    description: "DJI Action 2 Power Combo กล้อง 4K ที่กันน้ำได้ 10 เมตร มาพร้อมแบตเตอรี่ใช้งานยาวนาน 180 นาที\nBattery: 31 mins/charge",
    price: 8990,
    category: "Action Camera",
    image: "https://happy.dealdroid.net/uploads/products/202/xube0xkfq7hm8h8l9uiifbjj_small.jpg",
    tags: ["action camera", "DJI Action 2", "4K", "กันน้ำ", "128G"],
    status: "discontinue",
    recommendedAlternative: "Osmo Action 5 Pro",
  },

  // === Action Cameras - Osmo Action 3 Series (Discontinued) ===
  {
    id: 3010,
    name: "Osmo Action 3 Adventure Combo",
    description: "Osmo Action 3 สามารถถ่ายภาพความละเอียด 12MP และถ่ายวิดีโอได้อย่างลื่นไหลสูงสุด 4K/120fps เทคโนโลยี EIS\nBattery: 31 mins/charge",
    price: 10290,
    category: "Action Camera",
    image: "https://placehold.co/300x300/f59e0b/white?text=Action+3",
    tags: ["action camera", "Osmo Action 3", "4K", "adventure combo"],
    status: "discontinue",
    recommendedAlternative: "Osmo Action 5 Pro",
  },
  {
    id: 3011,
    name: "Osmo Action 3 Standard Combo",
    description: "Osmo Action 3 สามารถถ่ายภาพความละเอียด 12MP และถ่ายวิดีโอได้อย่างลื่นไหลสูงสุด 4K/120fps เทคโนโลยี EIS\nBattery: 31 mins/charge",
    price: 6490,
    category: "Action Camera",
    image: "https://placehold.co/300x300/f59e0b/white?text=Action+3+Std",
    tags: ["action camera", "Osmo Action 3", "4K", "standard combo"],
    status: "discontinue",
    recommendedAlternative: "Osmo Action 5 Pro",
  },

  // === Action Cameras - Osmo Action 4 Series (Discontinued) ===
  {
    id: 3020,
    name: "Osmo Action 4 Adventure Combo",
    description: "DJI Osmo Action 4 ก้าวข้ามทุกการผจญภัย มีการออกแบบที่ปลดออกอย่างรวดเร็วสำหรับการติดตั้งในแนวนอนและแนวตั้ง หน้าจอสัมผัสสีเต็มรูปแบบ\nBattery: 31 mins/charge",
    price: 11620,
    category: "Action Camera",
    image: "https://placehold.co/300x300/10b981/white?text=Action+4+Adv",
    tags: ["action camera", "Osmo Action 4", "4K", "adventure combo"],
    status: "discontinue",
    recommendedAlternative: "Osmo Action 5 Pro",
  },
  {
    id: 3021,
    name: "Osmo Action 4 Standard Combo",
    description: "DJI Osmo Action 4 ก้าวข้ามทุกการผจญภัย มีการออกแบบที่ปลดออกอย่างรวดเร็วสำหรับการติดตั้งในแนวนอนและแนวตั้ง หน้าจอสัมผัสสีเต็มรูปแบบ\nBattery: 31 mins/charge",
    price: 8560,
    category: "Action Camera",
    image: "https://placehold.co/300x300/10b981/white?text=Action+4+Std",
    tags: ["action camera", "Osmo Action 4", "4K", "standard combo"],
    status: "discontinue",
    recommendedAlternative: "Osmo Action 5 Pro",
  },

  // === Action Cameras - Osmo Action 5 Pro Series (Active) ===
  {
    id: 3030,
    name: "Osmo Action 5 Pro Adventure Combo",
    description: "DJI Osmo Action 5 Pro กล้องแอคชั่นรุ่นใหม่ เซนเซอร์ 1/1.3\" CMOS วิดีโอ 4K/120fps ภาพนิ่ง 40MP กันน้ำ 20 เมตร (IP68) แบตเตอรี่ใช้งานได้นาน 240 นาที (4 ชม.) ระบบกันสั่น 360° HorizonSteady รองรับ 10-bit D-Log M\nBattery: 240 mins/charge\nInsurance (Service Plus): 2 years 600 baht, 3 years 1,000 baht",
    price: 15720,
    category: "Action Camera",
    image: "https://placehold.co/300x300/f59e0b/white?text=Action+5+Pro+Adv",
    tags: ["action camera", "Osmo Action 5 Pro", "4K/120fps", "กันน้ำ 20m", "EIS", "adventure combo", "240 นาที"],
    status: "active",
  },
  {
    id: 3031,
    name: "Osmo Action 5 Pro Standard Combo",
    description: "DJI Osmo Action 5 Pro กล้องแอคชั่นรุ่นใหม่ เซนเซอร์ 1/1.3\" CMOS วิดีโอ 4K/120fps ภาพนิ่ง 40MP กันน้ำ 20 เมตร (IP68) แบตเตอรี่ใช้งานได้นาน 240 นาที (4 ชม.) ระบบกันสั่น 360° HorizonSteady รองรับ 10-bit D-Log M\nBattery: 240 mins/charge\nInsurance (Service Plus): 2 years 600 baht, 3 years 1,000 baht",
    price: 12740,
    category: "Action Camera",
    image: "https://placehold.co/300x300/f59e0b/white?text=Action+5+Pro+Std",
    tags: ["action camera", "Osmo Action 5 Pro", "4K/120fps", "กันน้ำ 20m", "EIS", "standard combo", "240 นาที"],
    status: "active",
  },

  // === Action Cameras - Osmo 360 Series (Active) ===
  {
    id: 3040,
    name: "Osmo 360 Adventure Combo",
    description: "DJI Osmo 360 กล้อง 360° รุ่นเรือธง ความละเอียด 8K เซนเซอร์ Square CMOS 1 นิ้ว วิดีโอ 8K/50fps ภาพนิ่ง 120MP กันน้ำ IP68 ลึก 10 เมตร แบตเตอรี่ 190 นาที รองรับ Wi-Fi 6 / Bluetooth 5.1\nBattery: 190 mins/charge\nInsurance (Service Plus): 2 years 600 baht, 3 years 1,000 baht",
    price: 18090,
    category: "Action Camera",
    image: "https://placehold.co/300x300/6366f1/white?text=Osmo+360+Adv",
    tags: ["action camera", "Osmo 360", "8K", "360 degree", "adventure combo", "กันน้ำ"],
    status: "active",
  },
  {
    id: 3041,
    name: "Osmo 360 Standard Combo",
    description: "DJI Osmo 360 กล้อง 360° รุ่นเรือธง ความละเอียด 8K เซนเซอร์ Square CMOS 1 นิ้ว วิดีโอ 8K/50fps ภาพนิ่ง 120MP กันน้ำ IP68 ลึก 10 เมตร แบตเตอรี่ 190 นาที รองรับ Wi-Fi 6 / Bluetooth 5.1\nBattery: 190 mins/charge\nInsurance (Service Plus): 2 years 600 baht, 3 years 1,000 baht",
    price: 14290,
    category: "Action Camera",
    image: "https://placehold.co/300x300/6366f1/white?text=Osmo+360+Std",
    tags: ["action camera", "Osmo 360", "8K", "360 degree", "standard combo", "กันน้ำ"],
    status: "active",
  },

  // === Pocket Cameras - Osmo Pocket 3 (Active) ===
  {
    id: 3050,
    name: "Osmo Pocket 3",
    description: "DJI Osmo Pocket 3 กล้องกิมบอลอเนกประสงค์ เซนเซอร์ 1\" CMOS วิดีโอ 4K/60fps Slow-Motion 4K/120fps ภาพนิ่ง 9.4MP หน้าจอ OLED 2 นิ้ว ระบบกันสั่น 3 แกน ไมค์ 3 ตัว รองรับ 10-bit D-Log M ใช้งาน 166 นาที\nBattery: 166 mins/charge\nInsurance (Service Plus): 2 years 600 baht, 3 years 1,000 baht",
    price: 14450,
    category: "Action Camera",
    image: "https://placehold.co/300x300/8b5cf6/white?text=Pocket+3",
    tags: ["pocket camera", "Osmo Pocket 3", "4K", "gimbal", "กันสั่น", "vlog"],
    status: "active",
  },
  {
    id: 3051,
    name: "Osmo Pocket 3 Creator Combo",
    description: "DJI Osmo Pocket 3 Creator Combo กล้องกิมบอลอเนกประสงค์ เซนเซอร์ 1\" CMOS วิดีโอ 4K/60fps Slow-Motion 4K/120fps ภาพนิ่ง 9.4MP หน้าจอ OLED 2 นิ้ว ระบบกันสั่น 3 แกน ไมค์ 3 ตัว รองรับ 10-bit D-Log M ใช้งาน 166 นาที มาพร้อม Wide-Angle Lens, DJI Mic 2, Battery Handle\nBattery: 166 mins/charge\nInsurance (Service Plus): 2 years 600 baht, 3 years 1,000 baht",
    price: 17650,
    category: "Action Camera",
    image: "https://placehold.co/300x300/8b5cf6/white?text=Pocket+3+Creator",
    tags: ["pocket camera", "Osmo Pocket 3", "4K", "gimbal", "creator combo", "vlog"],
    status: "active",
  },
  {
    id: 3052,
    name: "DJI Pocket 2",
    description: "DJI Pocket 2 ระบบกันสั่น 3 แกน ขนาดเล็กกะทัดรัด เซนเซอร์ 1/1.7 นิ้ว เปิดใช้งานได้ใน 1 วินาที\nBattery: 31 mins/charge",
    price: 11900,
    category: "Action Camera",
    image: "https://placehold.co/300x300/8b5cf6/white?text=Pocket+2",
    tags: ["pocket camera", "DJI Pocket 2", "4K", "gimbal"],
    status: "discontinue",
    recommendedAlternative: "Osmo Pocket 3",
  },
  {
    id: 3053,
    name: "DJI Pocket 2 Creator Combo",
    description: "DJI Pocket 2 Creator Combo ระบบกันสั่น 3 แกน ขนาดเล็กกะทัดรัด เซนเซอร์ 1/1.7 นิ้ว\nBattery: 31 mins/charge",
    price: 16990,
    category: "Action Camera",
    image: "https://placehold.co/300x300/8b5cf6/white?text=Pocket+2+Creator",
    tags: ["pocket camera", "DJI Pocket 2", "4K", "gimbal", "creator combo"],
    status: "discontinue",
    recommendedAlternative: "Osmo Pocket 3",
  },

  // === Pocket Cameras - Osmo Nano (Active) ===
  {
    id: 3060,
    name: "OSMO NANO Standard Combo (64GB)",
    description: "DJI Osmo Nano กิมบอลกันสั่นพกพา น้ำหนักเบาเพียง 52 กรัม วิดีโอ 4K/60fps ภาพนิ่ง 35MP กันสั่น RockSteady 3.0 เซนเซอร์ 1/1.3\" CMOS กันน้ำ 10 เมตร หน้าจอ OLED 1.96 นิ้ว ใช้งาน 200 นาที\nBattery: กล้องเดี่ยว 90 นาที, กล้อง + Dock 200 นาที\nInsurance (Service Plus): 2 years 600 baht, 3 years 1,000 baht",
    price: 9300,
    category: "Action Camera",
    image: "https://placehold.co/300x300/ec4899/white?text=Osmo+Nano+64",
    tags: ["pocket camera", "Osmo Nano", "4K", "gimbal", "กันสั่น", "vlog", "64GB"],
    status: "active",
  },
  {
    id: 3061,
    name: "OSMO NANO Standard Combo (128GB)",
    description: "DJI Osmo Nano กิมบอลกันสั่นพกพา น้ำหนักเบาเพียง 52 กรัม วิดีโอ 4K/60fps ภาพนิ่ง 35MP กันสั่น RockSteady 3.0 เซนเซอร์ 1/1.3\" CMOS กันน้ำ 10 เมตร หน้าจอ OLED 1.96 นิ้ว ใช้งาน 200 นาที\nBattery: กล้องเดี่ยว 90 นาที, กล้อง + Dock 200 นาที\nInsurance (Service Plus): 2 years 600 baht, 3 years 1,000 baht",
    price: 10700,
    category: "Action Camera",
    image: "https://placehold.co/300x300/ec4899/white?text=Osmo+Nano+128",
    tags: ["pocket camera", "Osmo Nano", "4K", "gimbal", "กันสั่น", "vlog", "128GB"],
    status: "active",
  },

  // === FPV Drones - Avata 2 Series (Active) ===
  {
    id: 1541,
    name: "DJI Avata 2 (Drone Only)",
    description: "DJI Avata 2 เซนเซอร์ 1/1.3\" รูรับแสง f/2.8 มุมมองภาพ 155° วิดีโอ 4K/60fps และ 2.7K/120fps ภาพนิ่ง 12MP ระบบส่งสัญญาณ O4 ระยะ 13 กม ความจำภายใน 46GB ความเร็วสูงสุด Sport 58 กม/ชม Manual 97 กม/ชม\nBattery: 23 mins/charge",
    price: 12650,
    category: "FPV Drone",
    image: "https://happy.dealdroid.net/uploads/products/202/Drone-Only1_small.jpg",
    tags: ["drone", "FPV", "Avata 2", "4K", "drone only"],
    status: "active",
  },
  {
    id: 1542,
    name: "DJI Avata 2 Fly More Combo (Single Battery)",
    description: "DJI Avata 2 Fly More Combo พร้อม Goggles 3 และ RC Motion 3 เซนเซอร์ 1/1.3\" รูรับแสง f/2.8 วิดีโอ 4K/60fps 2.7K/120fps ระบบส่งสัญญาณ O4 ระยะ 13 กม Goggles 3: Real view ไล่ฝ้า หูฟังในตัว แบต 3 ชม\nBattery: 23 mins/charge",
    price: 25250,
    category: "FPV Drone",
    image: "https://happy.dealdroid.net/uploads/products/202/a8gb7ytaseh0pvu2c722n2q5_small.jpg",
    tags: ["drone", "FPV", "Avata 2", "fly more combo", "Goggles 3", "RC Motion 3", "single battery"],
    status: "active",
  },
  {
    id: 1543,
    name: "DJI Avata 2 Fly More Combo (Three Batteries)",
    description: "DJI Avata 2 Fly More Combo พร้อม Goggles 3 RC Motion 3 แบต 3 ก้อน Two-Way Charging Hub และ Sling Bag เซนเซอร์ 1/1.3\" รูรับแสง f/2.8 วิดีโอ 4K/60fps 2.7K/120fps ระบบส่งสัญญาณ O4 ระยะ 13 กม\nBattery: 23 mins/charge",
    price: 29250,
    category: "FPV Drone",
    image: "https://happy.dealdroid.net/uploads/products/202/xk9osxfdzfwvo41t5ou9vk38_small.jpg",
    tags: ["drone", "FPV", "Avata 2", "fly more combo", "three batteries", "Goggles 3"],
    status: "active",
  },
  {
    id: 2288,
    name: "DJI Avata 2 Fly Smart Combo (Single Battery)",
    description: "DJI Avata 2 Fly Smart Combo พร้อม Goggles N3 และ RC Motion 3 เซนเซอร์ 1/1.3\" รูรับแสง f/2.8 วิดีโอ 4K/60fps 2.7K/120fps ระบบส่งสัญญาณ O4 ระยะ 13 กม\nBattery: 23 mins/charge",
    price: 15650,
    category: "FPV Drone",
    image: "https://happy.dealdroid.net/uploads/products/202/rawvrgiyd3dc4yjn8b5wcojj_small.jpg",
    tags: ["drone", "FPV", "Avata 2", "fly smart combo", "Goggles N3", "single battery"],
    status: "active",
  },
  {
    id: 2289,
    name: "DJI Avata 2 Fly Smart Combo (Three Batteries)",
    description: "DJI Avata 2 Fly Smart Combo พร้อม Goggles N3 RC Motion 3 แบต 3 ก้อน และ Two-Way Charging Hub เซนเซอร์ 1/1.3\" รูรับแสง f/2.8 วิดีโอ 4K/60fps 2.7K/120fps ระบบส่งสัญญาณ O4 ระยะ 13 กม\nBattery: 23 mins/charge",
    price: 19750,
    category: "FPV Drone",
    image: "https://happy.dealdroid.net/uploads/products/202/szrsvcq5hj0jt1qhcbrwyboj_small.jpg",
    tags: ["drone", "FPV", "Avata 2", "fly smart combo", "Goggles N3", "three batteries"],
    status: "active",
  },

  // === FPV Drones - Avata 1 Series (Discontinued) ===
  {
    id: 1536,
    name: "DJI Avata Explorer Combo",
    description: "DJI Avata เซนเซอร์ CMOS 1/1.7 นิ้ว บันทึกภาพมุมกว้างพิเศษ 4K รูรับแสง f/2.8\nBattery: 31 mins/charge",
    price: 42100,
    category: "FPV Drone",
    image: "https://happy.dealdroid.net/uploads/products/202/m8e834j7880m1ypa2r200tfh_small.jpg",
    tags: ["drone", "FPV", "Avata", "explorer combo", "4K"],
    status: "discontinue",
    recommendedAlternative: "DJI Avata 2",
  },
  {
    id: 1537,
    name: "DJI Avata Fly Smart Combo (DJI FPV Goggles V2)",
    description: "DJI Avata เซนเซอร์ CMOS 1/1.7 นิ้ว บันทึกภาพมุมกว้างพิเศษ 4K รูรับแสง f/2.8\nBattery: 31 mins/charge",
    price: 38600,
    category: "FPV Drone",
    image: "https://placehold.co/300x300/6366f1/white?text=Avata+FPV+V2",
    tags: ["drone", "FPV", "Avata", "fly smart combo", "Goggles V2"],
    status: "discontinue",
    recommendedAlternative: "DJI Avata 2",
  },
  {
    id: 1538,
    name: "DJI Avata Pro-View Combo (DJI Goggles 2)",
    description: "DJI Avata เซนเซอร์ CMOS 1/1.7 นิ้ว บันทึกภาพมุมกว้างพิเศษ 4K รูรับแสง f/2.8\nBattery: 31 mins/charge",
    price: 46800,
    category: "FPV Drone",
    image: "https://placehold.co/300x300/6366f1/white?text=Avata+Goggles2",
    tags: ["drone", "FPV", "Avata", "pro-view combo", "Goggles 2"],
    status: "discontinue",
    recommendedAlternative: "DJI Avata 2",
  },
  {
    id: 1539,
    name: "DJI Avata Pro-View Combo (DJI RC Motion 2)",
    description: "DJI Avata เซนเซอร์ CMOS 1/1.7 นิ้ว บันทึกภาพมุมกว้างพิเศษ 4K รูรับแสง f/2.8\nBattery: 31 mins/charge",
    price: 47900,
    category: "FPV Drone",
    image: "https://placehold.co/300x300/6366f1/white?text=Avata+Motion2",
    tags: ["drone", "FPV", "Avata", "pro-view combo", "RC Motion 2"],
    status: "discontinue",
    recommendedAlternative: "DJI Avata 2",
  },

  // === FPV Drones - DJI FPV (Discontinued) ===
  {
    id: 1530,
    name: "DJI FPV Explorer Combo",
    description: "บินได้นานสูงสุด 20 นาที บินเร็วสูงสุด 140 กม/ชม ต้านทานแรงลมระดับ 6 แว่ตา DJI Goggles Integra ภาพชัด 1080p รีโมท DJI FPV Remote Controller 2\nBattery: 20 mins/charge",
    price: 31900,
    category: "FPV Drone",
    image: "https://placehold.co/300x300/ef4444/white?text=FPV+Explorer",
    tags: ["drone", "FPV", "DJI FPV", "explorer combo", "140 กม/ชม"],
    status: "discontinue",
    recommendedAlternative: "DJI Avata 2",
  },

  // === Camera Drones - Air 2S (Discontinued) ===
  {
    id: 2010,
    name: "DJI Air 2S Fly More Combo",
    description: "DJI Air 2S โดรนถ่ายภาพ 20MP วิดีโอ 5.4K/30fps หรือ 4K/60fps เซนเซอร์ CMOS 1 นิ้ว\nBattery: 31 mins/charge",
    price: 42000,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/6366f1/white?text=Air+2S",
    tags: ["drone", "Air 2S", "5.4K", "1 inch sensor", "fly more combo"],
    status: "discontinue",
    recommendedAlternative: "DJI Air 3S",
  },

  // === Camera Drones - Air 3 Series (Discontinued) ===
  {
    id: 2020,
    name: "DJI Air 3 (DJI RC-N2)",
    description: "DJI Air 3 โดรนกล้องคู่ บินได้นาน 46 นาที ระบบเซนเซอร์กันชนรอบทิศทาง น้ำหนัก 720 กรัม บินเร็ว 21 เมตร/วินาที\nBattery: 31 mins/charge",
    price: 27990,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/6366f1/white?text=Air+3+N2",
    tags: ["drone", "Air 3", "4K", "กล้องคู่", "46 นาที"],
    status: "discontinue",
    recommendedAlternative: "DJI Air 3S",
  },
  {
    id: 2021,
    name: "DJI Air 3 Fly More Combo (DJI RC 2)",
    description: "DJI Air 3 Fly More Combo โดรนกล้องคู่ บินได้นาน 46 นาที ระบบเซนเซอร์กันชนรอบทิศทาง น้ำหนัก 720 กรัม\nBattery: 31 mins/charge",
    price: 38790,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/6366f1/white?text=Air+3+FMC+RC2",
    tags: ["drone", "Air 3", "4K", "fly more combo", "RC 2"],
    status: "discontinue",
    recommendedAlternative: "DJI Air 3S",
  },
  {
    id: 2022,
    name: "DJI Air 3 Fly More Combo (DJI RC-N2)",
    description: "DJI Air 3 Fly More Combo โดรนกล้องคู่ บินได้นาน 46 นาที ระบบเซนเซอร์กันชนรอบทิศทาง น้ำหนัก 720 กรัม\nBattery: 31 mins/charge",
    price: 33990,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/6366f1/white?text=Air+3+FMC+N2",
    tags: ["drone", "Air 3", "4K", "fly more combo", "RC-N2"],
    status: "discontinue",
    recommendedAlternative: "DJI Air 3S",
  },

  // === Camera Drones - Air 3S Series (Active) ===
  {
    id: 2030,
    name: "DJI Air 3S (DJI RC-N3)",
    description: "DJI Air 3S Dual-Camera โดรนกล้องคู่ กล้องหลัก CMOS 1 นิ้ว 50MP Wide-Angle f/1.8 24mm วิดีโอ 4K/60fps Slow-motion 4K/120fps เลนส์ Medium Tele 70mm f/2.8 48MP น้ำหนัก 724 กรัม บินนาน 45 นาที ระบบ APAS 5.0 LiDAR ด้านหน้า ความจำ 42GB\nBattery: 45 mins/charge\nInsurance (Service Plus): 2 years 2,000 baht, 3 years 3,500 baht",
    price: 34990,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/1f2937/white?text=Air+3S+N3",
    tags: ["drone", "Air 3S", "4K", "กล้องคู่", "dual camera", "1 inch", "45 นาที", "RC-N3"],
    status: "active",
  },
  {
    id: 2031,
    name: "DJI Air 3S Fly More Combo (DJI RC 2)",
    description: "DJI Air 3S Fly More Combo Dual-Camera กล้องหลัก CMOS 1 นิ้ว 50MP Wide-Angle f/1.8 เลนส์ Medium Tele 70mm f/2.8 48MP น้ำหนัก 724 กรัม บินนาน 45 นาที มาพร้อม RC 2 แบต 3 ก้อน ND Filter Set กระเป๋า\nBattery: 45 mins/charge\nInsurance (Service Plus): 2 years 2,000 baht, 3 years 3,500 baht",
    price: 49900,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/1f2937/white?text=Air+3S+FMC+RC2",
    tags: ["drone", "Air 3S", "4K", "fly more combo", "RC 2", "dual camera"],
    status: "active",
  },
  {
    id: 2032,
    name: "DJI Air 3S Fly More Combo (DJI RC-N3)",
    description: "DJI Air 3S Fly More Combo Dual-Camera กล้องหลัก CMOS 1 นิ้ว 50MP Wide-Angle f/1.8 เลนส์ Medium Tele 70mm f/2.8 48MP น้ำหนัก 724 กรัม บินนาน 45 นาที มาพร้อม RC-N3 แบต 3 ก้อน ND Filter Set กระเป๋า\nBattery: 45 mins/charge\nInsurance (Service Plus): 2 years 2,000 baht, 3 years 3,500 baht",
    price: 43900,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/1f2937/white?text=Air+3S+FMC+N3",
    tags: ["drone", "Air 3S", "4K", "fly more combo", "RC-N3", "dual camera"],
    status: "active",
  },

  // === Camera Drones - DJI Flip Series (Active) ===
  {
    id: 2040,
    name: "DJI Flip (DJI RC 2)",
    description: "DJI Flip โดรนน้ำหนักเบา 249 กรัม เซนเซอร์ CMOS 1/1.3 นิ้ว วิดีโอ 4K/60fps HDR ความเร็วสูงสุด 12 ม/วินาที บินนาน 31 นาที ต้านแรงลมระดับ 5 ระบบ AI ติดตามวัตถุ\nBattery: 31 mins/charge\nInsurance (Service Plus): 2 years 1,200 baht, 3 years 2,000 baht",
    price: 18900,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/14b8a6/white?text=Flip+RC2",
    tags: ["drone", "DJI Flip", "4K", "249g", "น้ำหนักเบา", "RC 2"],
    status: "active",
  },
  {
    id: 2041,
    name: "DJI Flip Fly More Combo (DJI RC 2)",
    description: "DJI Flip Fly More Combo โดรนน้ำหนักเบา 249 กรัม เซนเซอร์ CMOS 1/1.3 นิ้ว วิดีโอ 4K/60fps HDR บินนาน 31 นาที มาพร้อม RC 2 แบต 3 ก้อน Charging Hub กระเป๋า\nBattery: 31 mins/charge\nInsurance (Service Plus): 2 years 1,200 baht, 3 years 2,000 baht",
    price: 23900,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/14b8a6/white?text=Flip+FMC+RC2",
    tags: ["drone", "DJI Flip", "4K", "fly more combo", "RC 2"],
    status: "active",
  },
  {
    id: 2042,
    name: "DJI Flip (RC-N3)",
    description: "DJI Flip โดรนน้ำหนักเบา 249 กรัม เซนเซอร์ CMOS 1/1.3 นิ้ว วิดีโอ 4K/60fps HDR ความเร็วสูงสุด 12 ม/วินาที บินนาน 31 นาที ต้านแรงลมระดับ 5 ระบบ AI ติดตามวัตถุ\nBattery: 31 mins/charge\nInsurance (Service Plus): 2 years 1,200 baht, 3 years 2,000 baht",
    price: 12900,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/14b8a6/white?text=Flip+N3",
    tags: ["drone", "DJI Flip", "4K", "249g", "น้ำหนักเบา", "RC-N3"],
    status: "active",
  },

  // === Camera Drones - Mavic 3 Series (Discontinued) ===
  {
    id: 2050,
    name: "DJI Mavic 3 Classic",
    description: "DJI Mavic 3 Classic ระบบส่งกำลัง O3+ ระยะ 9.32 ไมล์ วิดีโอ Full HD 1080p60\nBattery: 31 mins/charge",
    price: 43390,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/ec4899/white?text=Mavic+3+Classic",
    tags: ["drone", "Mavic 3 Classic", "Hasselblad", "5.1K"],
    status: "discontinue",
    recommendedAlternative: "DJI Mavic 4 Pro",
  },
  {
    id: 2051,
    name: "DJI Mavic 3 Classic (DJI RC)",
    description: "DJI Mavic 3 Classic ระบบส่งกำลัง O3+ ระยะ 9.32 ไมล์ วิดีโอ Full HD 1080p60 มาพร้อม DJI RC\nBattery: 31 mins/charge",
    price: 46990,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/ec4899/white?text=Mavic+3+Classic+RC",
    tags: ["drone", "Mavic 3 Classic", "Hasselblad", "DJI RC"],
    status: "discontinue",
    recommendedAlternative: "DJI Mavic 4 Pro",
  },
  {
    id: 2052,
    name: "DJI Mavic 3 Pro (DJI RC)",
    description: "DJI Mavic 3 Pro กล้องออพติคอล 3 ตัว รวมกล้องมุมกว้าง Hasselblad ระบบส่งกำลัง O3+\nBattery: 31 mins/charge",
    price: 66590,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/ec4899/white?text=Mavic+3+Pro+RC",
    tags: ["drone", "Mavic 3 Pro", "Hasselblad", "triple camera", "DJI RC"],
    status: "discontinue",
    recommendedAlternative: "DJI Mavic 4 Pro",
  },
  {
    id: 2053,
    name: "DJI Mavic 3 Pro Fly More Combo (DJI RC)",
    description: "DJI Mavic 3 Pro Fly More Combo กล้องออพติคอล 3 ตัว รวมกล้องมุมกว้าง Hasselblad\nBattery: 31 mins/charge",
    price: 84590,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/ec4899/white?text=Mavic+3+Pro+FMC",
    tags: ["drone", "Mavic 3 Pro", "Hasselblad", "fly more combo"],
    status: "discontinue",
    recommendedAlternative: "DJI Mavic 4 Pro",
  },
  {
    id: 2054,
    name: "DJI Mavic 3 Pro Fly More Combo (DJI RC PRO)",
    description: "DJI Mavic 3 Pro Fly More Combo กล้องออพติคอล 3 ตัว รวมกล้องมุมกว้าง Hasselblad มาพร้อม RC PRO\nBattery: 31 mins/charge",
    price: 107800,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/ec4899/white?text=Mavic+3+Pro+RCPRO",
    tags: ["drone", "Mavic 3 Pro", "Hasselblad", "fly more combo", "RC PRO"],
    status: "discontinue",
    recommendedAlternative: "DJI Mavic 4 Pro",
  },
  {
    id: 2055,
    name: "DJI Mavic 3 Pro Cine Premium Combo",
    description: "DJI Mavic 3 Pro Cine Premium Combo กล้องออพติคอล 3 ตัว รวมกล้องมุมกว้าง Hasselblad\nBattery: 31 mins/charge",
    price: 152090,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/ec4899/white?text=Mavic+3+Pro+Cine",
    tags: ["drone", "Mavic 3 Pro", "Hasselblad", "cine", "premium combo"],
    status: "discontinue",
    recommendedAlternative: "DJI Mavic 4 Pro",
  },

  // === Camera Drones - Mavic 4 Pro Series (Active) ===
  {
    id: 2060,
    name: "DJI Mavic 4 Pro",
    description: "DJI Mavic 4 Pro กล้อง Hasselblad 100MP เซนเซอร์ 4/3\" วิดีโอ 6K/60fps HDR Gimbal 360° บินนาน 51 นาที ระบบส่งสัญญาณ O4+ ระยะ 30 กม ความจำ 64GB\nBattery: 51 mins/charge\nInsurance (Service Plus): 2 years 3,000 baht, 3 years 6,000 baht",
    price: 73990,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/0f172a/white?text=Mavic+4+Pro",
    tags: ["drone", "Mavic 4 Pro", "Hasselblad", "6K", "51 นาที", "มืออาชีพ"],
    status: "active",
  },
  {
    id: 2061,
    name: "DJI Mavic 4 Pro Fly More Combo (DJI RC 2)",
    description: "DJI Mavic 4 Pro Fly More Combo กล้อง Hasselblad 100MP เซนเซอร์ 4/3\" วิดีโอ 6K/60fps HDR Gimbal 360° บินนาน 51 นาที มาพร้อม RC 2 แบต 3 ก้อน ND Filter Set กระเป๋า\nBattery: 51 mins/charge\nInsurance (Service Plus): 2 years 3,000 baht, 3 years 6,000 baht",
    price: 99990,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/0f172a/white?text=Mavic+4+Pro+FMC",
    tags: ["drone", "Mavic 4 Pro", "Hasselblad", "6K", "fly more combo", "RC 2"],
    status: "active",
  },
  {
    id: 2062,
    name: "DJI Mavic 4 Pro 512GB Creator Combo (DJI RC Pro 2)",
    description: "DJI Mavic 4 Pro 512GB Creator Combo กล้อง Hasselblad 100MP เซนเซอร์ 4/3\" วิดีโอ 6K/60fps HDR Gimbal 360° บินนาน 51 นาที หน้าจอ Mini-LED 7\" หมุนได้ มาพร้อม RC Pro 2 แบต 3 ก้อน ความจำ 512GB\nBattery: 51 mins/charge\nInsurance (Service Plus): 2 years 3,000 baht, 3 years 6,000 baht",
    price: 120490,
    category: "Camera Drone",
    image: "https://placehold.co/300x300/0f172a/white?text=Mavic+4+Pro+512",
    tags: ["drone", "Mavic 4 Pro", "Hasselblad", "6K", "creator combo", "RC Pro 2", "512GB"],
    status: "active",
  },

  // === Gimbal / Stabilizer - Osmo Mobile SE (Discontinued) ===
  {
    id: 4010,
    name: "DJI Osmo Mobile SE",
    description: "OSMO MOBILE SE ออกแบบมาให้ง่ายต่อการใช้งาน น้ำหนักเบา ใช้งานได้ต่อเนื่อง 8 ชั่วโมง รองรับ iOS/Android มาพร้อม ActiveTrack 5.0\nBattery: 8 hrs/charge",
    price: 1880,
    category: "Gimbal",
    image: "https://placehold.co/300x300/3b82f6/white?text=OM+SE",
    tags: ["gimbal", "Osmo Mobile SE", "กันสั่น", "สมาร์ทโฟน", "ActiveTrack"],
    status: "discontinue",
    recommendedAlternative: "Osmo Mobile 7",
  },

  // === Gimbal / Stabilizer - Osmo Mobile 7 Series (Active) ===
  {
    id: 4020,
    name: "Osmo Mobile 7",
    description: "Osmo Mobile 7 กิมบอลสมาร์ทโฟน Gen 7 น้ำหนัก 300 กรัม All-in-One Design กันสั่น 3 แกน ActiveTrack 7.0 ใช้งาน 10 ชั่วโมง มีขาตั้งในตัว\nBattery: 10 ชั่วโมง",
    price: 2050,
    category: "Gimbal",
    image: "https://placehold.co/300x300/3b82f6/white?text=OM+7",
    tags: ["gimbal", "Osmo Mobile 7", "กันสั่น", "สมาร์ทโฟน", "ActiveTrack 7.0"],
    status: "active",
  },
  {
    id: 4021,
    name: "Osmo Mobile 7P",
    description: "Osmo Mobile 7P กิมบอลสมาร์ทโฟน Gen 7 น้ำหนัก 368 กรัม All-in-One Design กันสั่น 3 แกน ActiveTrack 7.0 ใช้งาน 10 ชั่วโมง มี Multifunctional Module Extension Rod Side Wave Wheel\nBattery: 10 ชั่วโมง",
    price: 3890,
    category: "Gimbal",
    image: "https://placehold.co/300x300/3b82f6/white?text=OM+7P",
    tags: ["gimbal", "Osmo Mobile 7P", "กันสั่น", "สมาร์ทโฟน", "ActiveTrack 7.0", "extension rod"],
    status: "active",
  },

  // === Gimbal / Stabilizer - DJI RS Series (Discontinued) ===
  {
    id: 4030,
    name: "DJI RS 3",
    description: "DJI RS 3 กิมบอลกล้อง น้ำหนัก 2.8 lb รับน้ำหนักสูงสุด 6.6 lb\nBattery: 31 mins/charge",
    price: 13600,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+3",
    tags: ["gimbal", "RS 3", "กันสั่น", "DSLR", "Mirrorless"],
    status: "discontinue",
    recommendedAlternative: "DJI RS 4 Mini",
  },
  {
    id: 4031,
    name: "DJI RS 3 Combo",
    description: "DJI RS 3 Combo กิมบอลกล้อง น้ำหนัก 2.8 lb รับน้ำหนักสูงสุด 6.6 lb\nBattery: 31 mins/charge",
    price: 17900,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+3+Combo",
    tags: ["gimbal", "RS 3", "กันสั่น", "DSLR", "Mirrorless", "combo"],
    status: "discontinue",
    recommendedAlternative: "DJI RS 4 Mini",
  },
  {
    id: 4032,
    name: "DJI RS 3 Mini",
    description: "DJI RS 3 Mini หน้าจอสัมผัสสี 1.4 นิ้ว UI ใหม่ ปรับฟังก์ชั่นได้โดยไม่ต้องใช้แอป\nBattery: 31 mins/charge",
    price: 10590,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+3+Mini",
    tags: ["gimbal", "RS 3 Mini", "กันสั่น", "DSLR", "Mirrorless"],
    status: "discontinue",
    recommendedAlternative: "DJI RS 4 Mini",
  },
  {
    id: 4033,
    name: "DJI RS 3 Pro",
    description: "DJI RS 3 Pro แพลตฟอร์มการขยายกล้องในตัว เทคโนโลยีล้ำสมัยจากซีรีส์ Ronin\nBattery: 31 mins/charge",
    price: 24700,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+3+Pro",
    tags: ["gimbal", "RS 3 Pro", "กันสั่น", "DSLR", "Mirrorless", "pro"],
    status: "discontinue",
    recommendedAlternative: "DJI RS 4 Mini",
  },
  {
    id: 4034,
    name: "DJI RS 3 Pro Combo",
    description: "DJI RS 3 Pro Combo แพลตฟอร์มการขยายกล้องในตัว เทคโนโลยีล้ำสมัยจากซีรีส์ Ronin\nBattery: 31 mins/charge",
    price: 31700,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+3+Pro+Combo",
    tags: ["gimbal", "RS 3 Pro", "กันสั่น", "DSLR", "Mirrorless", "pro", "combo"],
    status: "discontinue",
    recommendedAlternative: "DJI RS 4 Mini",
  },
  {
    id: 4035,
    name: "DJI RS 4",
    description: "DJI RS 4 รับน้ำหนัก 3 kg แกน tilt ยาวขึ้น 8.5mm Native Vertical Shooting\nBattery: 31 mins/charge",
    price: 13600,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+4",
    tags: ["gimbal", "RS 4", "กันสั่น", "DSLR", "Mirrorless"],
    status: "discontinue",
    recommendedAlternative: "DJI RS 4 Mini",
  },
  {
    id: 4036,
    name: "DJI RS 4 Combo",
    description: "DJI RS 4 Combo รับน้ำหนัก 3 kg แกน tilt ยาวขึ้น 8.5mm Native Vertical Shooting\nBattery: 31 mins/charge",
    price: 17850,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+4+Combo",
    tags: ["gimbal", "RS 4", "กันสั่น", "DSLR", "Mirrorless", "combo"],
    status: "discontinue",
    recommendedAlternative: "DJI RS 4 Mini",
  },
  {
    id: 4037,
    name: "DJI RS 4 Pro",
    description: "DJI RS 4 Pro แขนแกนคาร์บอนไฟเบอร์ รับน้ำหนัก 4.5 กก. รองรับกล้อง Mirrorless/Cinema\nBattery: 31 mins/charge",
    price: 29000,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+4+Pro",
    tags: ["gimbal", "RS 4 Pro", "กันสั่น", "DSLR", "Mirrorless", "cinema", "pro"],
    status: "discontinue",
    recommendedAlternative: "DJI RS 4 Mini",
  },
  {
    id: 4038,
    name: "DJI RS 4 Pro Combo",
    description: "DJI RS 4 Pro Combo แขนแกนคาร์บอนไฟเบอร์ รับน้ำหนัก 4.5 กก. รองรับกล้อง Mirrorless/Cinema\nBattery: 31 mins/charge",
    price: 37000,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+4+Pro+Combo",
    tags: ["gimbal", "RS 4 Pro", "กันสั่น", "DSLR", "Mirrorless", "cinema", "pro", "combo"],
    status: "discontinue",
    recommendedAlternative: "DJI RS 4 Mini",
  },

  // === Gimbal / Stabilizer - DJI RS 4 Mini & RS 5 (Active) ===
  {
    id: 4040,
    name: "DJI RS 4 Mini",
    description: "DJI RS 4 Mini กิมบอลระดับมืออาชีพขนาดกะทัดรัด น้ำหนัก 890 กรัม รับน้ำหนักสูงสุด 2 กก. ใช้งานได้ทั้งกล้อง DSLR/Mirrorless และสมาร์ทโฟน ระบบกันสั่น 4th-Gen ใช้งาน 13 ชั่วโมง ชาร์จ 110 นาที\nBattery: 13 hrs/use\nInsurance (Service Plus): ติดต่อทีมงาน",
    price: 10590,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+4+Mini",
    tags: ["gimbal", "RS 4 Mini", "กันสั่น", "DSLR", "Mirrorless", "สมาร์ทโฟน", "13 ชั่วโมง"],
    status: "active",
  },
  {
    id: 4041,
    name: "DJI RS 4 Mini Combo",
    description: "DJI RS 4 Mini Combo กิมบอลระดับมืออาชีพขนาดกะทัดรัด น้ำหนัก 890 กรัม รับน้ำหนักสูงสุด 2 กก. มาพร้อม RS Intelligent Tracking Module Briefcase Handle\nBattery: 13 ชั่วโมง",
    price: 13000,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+4+Mini+Combo",
    tags: ["gimbal", "RS 4 Mini", "กันสั่น", "DSLR", "Mirrorless", "combo", "tracking module"],
    status: "active",
  },
  {
    id: 4042,
    name: "DJI RS 5",
    description: "DJI RS 5 กิมบอลกล้อง รับน้ำหนัก 3 กก. ระบบติดตามอัจฉริยะ OLED ชาร์จ 1 ชั่วโมง ใช้งาน 14 ชั่วโมง รองรับ Sony/Canon/Panasonic/Fujifilm แกนเคลือบ Teflon\nBattery: 14 hrs/use",
    price: 16500,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+5",
    tags: ["gimbal", "RS 5", "กันสั่น", "DSLR", "Mirrorless", "14 ชั่วโมง", "OLED"],
    status: "active",
  },
  {
    id: 4043,
    name: "DJI RS 5 Combo",
    description: "DJI RS 5 Combo กิมบอลกล้อง รับน้ำหนัก 3 กก. ระบบติดตามอัจฉริยะ OLED ชาร์จ 1 ชั่วโมง ใช้งาน 14 ชั่วโมง มาพร้อม Briefcase Handle\nBattery: 14 hrs/use",
    price: 21000,
    category: "Gimbal",
    image: "https://placehold.co/300x300/14b8a6/white?text=RS+5+Combo",
    tags: ["gimbal", "RS 5", "กันสั่น", "DSLR", "Mirrorless", "combo", "briefcase handle"],
    status: "active",
  },

  // === Accessories ===
  {
    id: 5001,
    name: "DJI Avata 2 Intelligent Flight Battery",
    description: "แบตเตอรี่สำหรับ DJI Avata 2 ใช้งานได้ 23 นาที ชาร์จเร็ว 65W / 40 นาที",
    price: 2990,
    category: "อุปกรณ์เสริม",
    image: "https://placehold.co/300x300/a855f7/white?text=Battery",
    tags: ["แบตเตอรี่", "Avata 2", "battery", "อุปกรณ์เสริม"],
    status: "active",
  },
  {
    id: 5002,
    name: "DJI Goggles 3",
    description: "DJI Goggles 3 แว่น FPV สำหรับ Avata 2 รองรับ Real View, PiP, ระบบไล่ฝ้า, หูฟังในตัว, แบตเตอรี่ 3 ชม, Diopter Adjustment -6.0D to +2.0D",
    price: 15900,
    category: "อุปกรณ์เสริม",
    image: "https://placehold.co/300x300/06b6d4/white?text=Goggles+3",
    tags: ["goggles", "Goggles 3", "FPV", "แว่น", "อุปกรณ์เสริม"],
    status: "active",
  },
  {
    id: 5003,
    name: "DJI RC Motion 3",
    description: "DJI RC Motion 3 รีโมทควบคุม DJI Avata 2 ด้วยการเคลื่อนไหวมือ ใช้งานง่าย เหมาะสำหรับมือใหม่",
    price: 3990,
    category: "อุปกรณ์เสริม",
    image: "https://placehold.co/300x300/d946ef/white?text=RC+Motion+3",
    tags: ["remote", "RC Motion 3", "Avata 2", "รีโมท", "อุปกรณ์เสริม"],
    status: "active",
  },
  {
    id: 5004,
    name: "DJI Avata 2 Two-Way Charging Hub",
    description: "DJI Avata 2 Two-Way Charging Hub ชาร์จแบตเตอรี่ได้ 3 ก้อนพร้อมกัน รองรับชาร์จเร็ว 65W",
    price: 1990,
    category: "อุปกรณ์เสริม",
    image: "https://placehold.co/300x300/ef4444/white?text=Charging+Hub",
    tags: ["charging hub", "Avata 2", "ชาร์จ", "อุปกรณ์เสริม"],
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
