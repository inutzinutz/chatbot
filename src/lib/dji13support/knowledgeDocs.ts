export interface KnowledgeDoc {
  id: number;
  title: string;
  content: string;
  triggers: string[];
  tags: string[];
}

export const knowledgeDocs: KnowledgeDoc[] = [
  {
    id: 201,
    title: "คู่มือฉุกเฉินโดรนตกน้ำ",
    triggers: ["ตกน้ำ", "น้ำเข้า", "water", "เปียก", "โดนฝน", "flood"],
    tags: ["emergency", "water damage", "repair"],
    content:
      "คู่มือฉุกเฉินโดรน DJI ตกน้ำ\n\nห้ามทำ:\n- ห้ามเปิดสวิตช์เด็ดขาด\n- ห้ามชาร์จ\n- ห้ามกดปุ่มใดๆ\n\nทำทันที:\n1. ถอดแบตเตอรี่ออก\n2. สลัดน้ำออก เอียงโดรนไปมา\n3. ใช้ผ้าแห้งซับน้ำรอบนอก\n4. ถอด SD Card ออก\n5. ใส่ถุงข้าวสาร/silica gel ทิ้งไว้ 24-48 ชั่วโมง\n6. นำมาให้ช่างตรวจ (อย่าเพิ่งเปิดเอง)\n\nมี DJI Care Refresh ไหม? อาจเคลมตกน้ำได้ครับ\nLINE: @dji13support | โทร: 065-694-6155",
  },
  {
    id: 202,
    title: "คู่มือฉุกเฉินโดรน Flyaway (บินหนี/สูญหาย)",
    triggers: ["flyaway", "บินหนี", "หาย", "สูญหาย", "lost", "signal lost"],
    tags: ["emergency", "flyaway", "lost"],
    content:
      "คู่มือฉุกเฉินโดรน Flyaway\n\nทำทันที:\n1. เปิดแอป DJI Fly → ฟังก์ชัน 'Find My Drone' → ดูพิกัดสุดท้าย\n2. ตรวจ 'Flight Records' ในแอป ดูเส้นทางการบิน\n3. บันทึก/Export Flight Log ทันที (สำคัญมาก!)\n4. จดพิกัดสุดท้ายก่อนหาย\n\nการเคลม Flyaway:\n- ต้องมี DJI Care Refresh Plus เท่านั้น\n- ส่ง Flight Log + หลักฐานให้ทีมงาน\n- มีจำนวนครั้งเคลมตาม Package\n\nติดต่อทีมงานด่วน:\nLINE: @dji13support | โทร: 065-694-6155",
  },
  {
    id: 203,
    title: "Checklist วินิจฉัยโดรน DJI สำหรับช่าง",
    triggers: ["checklist", "วินิจฉัย", "diagnostic", "ขั้นตอนซ่อม", "ช่างซ่อม", "ตรวจสอบ"],
    tags: ["technician", "diagnostic", "repair"],
    content:
      "Checklist วินิจฉัยโดรน DJI\n\nStep 1 — Visual Inspection:\n□ Shell แตก/บิ่น/ร้าว\n□ ใบพัดสมดุล ไม่แตก ไม่โค้งงอ\n□ Gimbal ไม่ผิดรูป สาย Ribbon ไม่หัก\n□ พอร์ตชาร์จ/USB ไม่งอ ไม่มีสิ่งแปลกปลอม\n□ Motor ไม่มีสิ่งขีดขวาง ไม่มีเส้นด้าย/ผม\n\nStep 2 — Power Up:\n□ แบตเตอรี่ชาร์จเต็ม\n□ เปิดเครื่อง → ฟัง Beep มอเตอร์\n□ ตรวจ LED Status\n□ Gimbal Initialize ปกติ (ไม่สั่น ไม่ค้าง)\n□ ไฟสีไหนขึ้น (ปกติ = เขียวกระพริบ)\n\nStep 3 — DJI Assistant 2:\n□ เชื่อม USB → ตรวจ Error Code\n□ Motor Status แต่ละตัว (Speed/Temp)\n□ Sensor Status: IMU / Compass / Vision\n□ Flight Log ล่าสุด\n□ ตรวจ ESC Error\n\nStep 4 — Motor Test:\n□ Test มอเตอร์ทีละตัว\n□ ฟังเสียงผิดปกติ (แกร่กๆ = Bearing เสีย)\n□ ตรวจการสั่นสะเทือน\n□ RPM สม่ำเสมอไหม\n\nStep 5 — Flight Test (ถ้าผ่าน):\n□ Hover ในที่ โดยไม่มีลม\n□ ตรวจ Vibration ขณะบิน\n□ ตรวจ Gimbal ขณะบิน\n□ ทดสอบ Obstacle Sensing",
  },
  {
    id: 204,
    title: "DJI Error Code — รายการและวิธีแก้",
    triggers: ["error code", "error", "warning", "motor error", "imu error", "compass error", "gimbal overload", "esc error", "vision error", "รหัสผิดพลาด"],
    tags: ["error code", "diagnostic", "technician"],
    content:
      "DJI Error Code ที่พบบ่อยและวิธีแก้:\n\nMOTOR ERROR:\n- Motor Idle Speed Too High → ตรวจใบพัดกีดขวาง ทำความสะอาด\n- Motor Stall → มอเตอร์ผิดปกติ ต้องเปลี่ยน\n- Motor Output Error → ESC/Motor เสีย ส่งซ่อม\n\nIMU ERROR:\n- IMU Error → ทำ IMU Calibration บนพื้นราบ\n- IMU Warming Up → รอ 5 นาทีก่อนบิน\n- IMU Attitude Error → ส่งซ่อม\n\nCOMPASS ERROR:\n- Compass Error → ทำ Compass Calibration พื้นที่โล่ง\n- Strong Magnetic Interference → ย้ายออกจากพื้นที่\n- Compass Calibration Failed → ต้องซ่อม Compass Module\n\nGIMBAL ERROR:\n- Gimbal Overload → ปลด Protector / ทำ Gimbal Cal\n- Gimbal Motor Overloaded → สาย Ribbon หัก / Motor เสีย\n- Gimbal Calibration Failed → ต้องซ่อม\n\nESC ERROR:\n- ESC Failure → บอร์ด ESC เสีย ต้องซ่อม/เปลี่ยน\n- ESC Temperature Too High → ระบายความร้อนไม่ดี\n\nVISION SYSTEM ERROR:\n- Vision System Error → เช็ดเลนส์ / ทำ Vision Calibration\n- VPS Error → พื้นผิวใต้โดรนไม่ชัด / แสงน้อยเกิน\n\nบินไม่ได้ / No-Fly Zone → ตรวจ GPS Lock / ตรวจ GEO Zone",
  },
  {
    id: 205,
    title: "DJI Care Refresh — ขั้นตอนการเคลม",
    triggers: ["care refresh", "dji care", "เคลม care", "เคลมประกัน", "ยื่นเคลม", "care plan"],
    tags: ["care refresh", "claim", "warranty"],
    content:
      "DJI Care Refresh — ขั้นตอนการเคลม\n\nประเภทการเคลม:\n- Physical Damage: ชน แตก เสียหายจากอุบัติเหตุ\n- Water Damage: ตกน้ำ เปียกน้ำ\n- Flyaway (Care Refresh Plus เท่านั้น): โดรนสูญหาย\n\nเอกสารที่ต้องใช้:\n1. หมายเลข Serial Number โดรน\n2. หลักฐาน DJI Care Refresh ที่ยังไม่หมดอายุ\n3. รูปภาพ/วิดีโอความเสียหาย\n4. Flight Log (กรณี Flyaway บังคับ)\n\nขั้นตอน:\n1. แจ้งทีมงาน Support @ DJI 13 Store\n2. ส่งเอกสารครบ\n3. ทีมยื่นเรื่องต่อ DJI Service Center\n4. รับโดรนเครื่องใหม่หรือซ่อมกลับ (ขึ้นอยู่กับ Case)\n\nหมายเหตุ:\n- Care Refresh Standard: เคลมได้ 2 ครั้ง/ปี\n- Care Refresh Plus: เคลมได้ 2 ครั้ง/ปี รวม Flyaway 1 ครั้ง/ปี\n- มีค่า Deductible (ค่าใช้จ่ายส่วนต่าง) ตามรุ่น",
  },
  {
    id: 206,
    title: "ขั้นตอนอัปเดต Firmware DJI อย่างปลอดภัย",
    triggers: ["firmware", "อัปเดต", "update", "ซอฟต์แวร์", "software"],
    tags: ["firmware", "update", "maintenance"],
    content:
      "ขั้นตอนอัปเดต Firmware DJI อย่างปลอดภัย\n\nก่อนอัปเดต:\n- ชาร์จโดรนและ RC ให้ได้ 50%+\n- อัปเดตแอป DJI Fly ให้เป็น Version ล่าสุด\n- ตรวจ Internet ให้เสถียร\n- อย่าอัปเดตในที่มีสัญญาณอ่อน\n\nวิธีอัปเดตผ่าน DJI Fly:\n1. เปิดโดรนและ RC → เชื่อมต่อกัน\n2. เปิดแอป DJI Fly → มุมขวาบน (จุด 3 จุด)\n3. เลือก 'Firmware Update'\n4. รอดาวน์โหลดและติดตั้ง\n5. อย่าปิดแอปหรือปิดไฟระหว่างนี้!\n6. โดรนจะรีสตาร์ทเอง\n\nวิธีอัปเดตผ่าน DJI Assistant 2 (PC):\n1. โหลด DJI Assistant 2 จาก DJI.com\n2. เชื่อมต่อโดรนผ่าน USB (โดรนต้องเปิดอยู่)\n3. เลือกโดรน → Firmware Update\n4. รอจนเสร็จ\n\nปัญหาหลังอัปเดต:\n- โดรน Boot Loop → Reflash Firmware ใหม่\n- ฟีเจอร์หายไป → ทำ Factory Reset\n- มาที่ร้านช่วยแก้ให้ฟรีครับ",
  },
  {
    id: 207,
    title: "วิธีการส่งโดรนซ่อมทางไปรษณีย์",
    triggers: ["ส่งซ่อม", "ส่งไปรษณีย์", "ส่งพัสดุ", "ต่างจังหวัด", "ส่งทาง"],
    tags: ["shipping", "repair", "service"],
    content:
      "วิธีส่งโดรนซ่อมทางไปรษณีย์\n\nขั้นตอนก่อนส่ง:\n1. แจ้ง LINE @dji13support ก่อนส่งทุกครั้ง\n2. แจ้งชื่อ เบอร์โทร อาการเสียที่เกิดขึ้น\n3. รอเจ้าหน้าที่ยืนยันที่อยู่\n\nวิธีแพ็คโดรน:\n1. ถอดใบพัดออกทุกใบ\n2. ใส่ Gimbal Protector (ถ้ามี)\n3. ห่อโดรนด้วย Bubble Wrap อย่างน้อย 3 ชั้น\n4. ห่อ RC และอุปกรณ์อื่นด้วย\n5. ใส่กล่องกระดาษแข็ง เติม Paper Shred/Packing ให้แน่น\n6. ปิดเทปทุกด้านแน่นหนา\n\nขนส่งที่แนะนำ:\n- Kerry Express\n- Flash Express\n- J&T Express (ใช้ Box ของ Kerry แนะนำ)\n\nหมายเหตุ:\n- ค่าส่งมาที่ร้าน: ลูกค้าออก\n- ค่าส่งกลับ: ลูกค้าออก (โอนให้ล่วงหน้าหรือชำระพร้อมค่าซ่อม)\n- ประกันพัสดุ: แนะนำทำประกันกับขนส่งด้วย",
  },
  {
    id: 208,
    title: "การขึ้นทะเบียนโดรน กสทช. — ข้อมูลเบื้องต้น",
    triggers: ["ขึ้นทะเบียน", "กสทช", "ลงทะเบียนโดรน", "nbtc", "ทะเบียนโดรน"],
    tags: ["กสทช.", "register", "legal"],
    content:
      "การขึ้นทะเบียนโดรน กสทช.\n\nต้องขึ้นทะเบียนถ้าโดรนหนัก 250 กรัมขึ้นไป:\n- DJI Air 3 (720 กรัม) — ต้องขึ้น\n- DJI Mavic 3 (895 กรัม) — ต้องขึ้น\n- DJI Avata 2 (377 กรัม) — ต้องขึ้น\n- DJI Mini 4 Pro (249 กรัม) — ไม่ต้อง\n\nขั้นตอนเบื้องต้น:\n1. drone.nbtc.go.th → ลงทะเบียน\n2. กรอกข้อมูลโดรน + แนบเอกสาร\n3. รอ 3-5 วันทำการ → รับ QR Code\n4. พิมพ์ QR Code ติดที่โดรน\n\nค่าธรรมเนียม: ฟรี\n\nสำหรับขึ้นทะเบียนแทนหรือปรึกษาเพิ่มเติม:\nLINE: @dji13service (ทีมเอกสาร DJI 13 Store)\nโทร: 065-694-6155",
  },
];

export function matchKnowledgeDoc(message: string): KnowledgeDoc | undefined {
  const lower = message.toLowerCase();
  return knowledgeDocs.find((d) =>
    d.triggers.some((t) => lower.includes(t.toLowerCase()))
  );
}
