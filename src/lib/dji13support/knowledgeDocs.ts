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

  // ─── ราคาซ่อมตามรุ่น (จากข้อมูลจริง 6,644 งาน) ───

  {
    id: 301,
    title: "ราคาซ่อม DJI Mavic Mini 2",
    triggers: ["mavic mini 2", "mini2", "mini 2"],
    tags: ["repair-price", "mavic mini 2", "drone"],
    content:
      "ราคาซ่อม DJI Mavic Mini 2 (จากสถิติ 753 งานจริง)\n\nช่วงราคา: 200 – 13,400 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- กิมบอลไม่ทำงาน / ติดขัด / หัก (พบมากที่สุด)\n- ตกน้ำ\n- กิมบอลมีปัญหา\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบ กรุณาส่งรูป/วิดีโออาการมาก่อนครับ",
  },
  {
    id: 302,
    title: "ราคาซ่อม DJI Mavic Air 2",
    triggers: ["mavic air 2", "air2", "air 2"],
    tags: ["repair-price", "mavic air 2", "drone"],
    content:
      "ราคาซ่อม DJI Mavic Air 2 (จากสถิติ 520 งานจริง)\n\nช่วงราคา: 150 – 22,000 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- ตกน้ำ\n- กิมบอลหัก / กล้องหัก\n- Cannot Activate\n- ขาหลังขวาหัก\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 303,
    title: "ราคาซ่อม DJI Mavic Mini",
    triggers: ["mavic mini", "mini1", "dji mini "],
    tags: ["repair-price", "mavic mini", "drone"],
    content:
      "ราคาซ่อม DJI Mavic Mini (จากสถิติ 297 งานจริง)\n\nช่วงราคา: 190 – 10,600 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- กิมบอลไม่ทำงาน / ติดขัด\n- ตกน้ำ\n- ขาหลังซ้ายหัก\n- เปิดเครื่องไม่ติด\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 304,
    title: "ราคาซ่อม DJI Mavic Pro",
    triggers: ["mavic pro", "mavicpro"],
    tags: ["repair-price", "mavic pro", "drone"],
    content:
      "ราคาซ่อม DJI Mavic Pro / Mavic Pro Platinum (จากสถิติ 458 งานจริง)\n\nช่วงราคา: 300 – 21,100 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- กิมบอลไม่ทำงาน / มีปัญหา\n- Gimbal motor overload\n- ตกน้ำ\n- กิมบอลสั่น / กล้องสั่น\n- สายแพรขาด\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 305,
    title: "ราคาซ่อม DJI Air 2S",
    triggers: ["air 2s", "air2s", "dji air 2s"],
    tags: ["repair-price", "air 2s", "drone"],
    content:
      "ราคาซ่อม DJI Air 2S (จากสถิติ 224 งานจริง)\n\nช่วงราคา: 200 – 31,300 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- กิมบอลไม่ทำงาน / มีปัญหา / หัก\n- ขาหน้าซ้ายหัก / ขาหลังขวาหัก\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 306,
    title: "ราคาซ่อม DJI Mini 3 Pro",
    triggers: ["mini 3 pro", "mini3pro", "mini3 pro", "mini 3pro"],
    tags: ["repair-price", "mini 3 pro", "drone"],
    content:
      "ราคาซ่อม DJI Mini 3 Pro (จากสถิติ 201 งานจริง)\n\nช่วงราคา: 300 – 22,000 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- บินชน\n- กิมบอลไม่ทำงาน\n- ขาหน้าซ้าย/ขวาหัก\n- กิมบอลมีเสียง\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 307,
    title: "ราคาซ่อม DJI Mini 4 Pro",
    triggers: ["mini 4 pro", "mini4pro", "mini4 pro", "mini 4pro"],
    tags: ["repair-price", "mini 4 pro", "drone"],
    content:
      "ราคาซ่อม DJI Mini 4 Pro (จากสถิติ 169 งานจริง)\n\nช่วงราคา: 300 – 14,700 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- บินชน\n- ขามอเตอร์หน้าหัก\n- ยางยึดกิมบอลขาด\n- Activate Failed\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 308,
    title: "ราคาซ่อม DJI Mini 3",
    triggers: ["dji mini 3 ", "mini3 ", " mini 3 "],
    tags: ["repair-price", "mini 3", "drone"],
    content:
      "ราคาซ่อม DJI Mini 3 (จากสถิติ 113 งานจริง)\n\nช่วงราคา: 300 – 9,800 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- ขามอเตอร์หน้า/หลังซ้ายหัก\n- กิมบอลมีปัญหา\n- บินตก\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 309,
    title: "ราคาซ่อม DJI Mini 2 SE",
    triggers: ["mini 2 se", "mini2se", "mini2 se"],
    tags: ["repair-price", "mini 2 se", "drone"],
    content:
      "ราคาซ่อม DJI Mini 2 SE (จากสถิติ 83 งานจริง)\n\nช่วงราคา: 300 – 6,990 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- กิมบอลไม่ทำงาน / ติดขัด\n- ระบบนำทางผิดพลาด\n- บินตก\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 310,
    title: "ราคาซ่อม DJI Mini SE",
    triggers: ["mini se", "minise"],
    tags: ["repair-price", "mini se", "drone"],
    content:
      "ราคาซ่อม DJI Mini SE (จากสถิติ 62 งานจริง)\n\nช่วงราคา: 300 – 6,900 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- ตกน้ำ\n- กิมบอลไม่ทำงาน / ติดขัด\n- ขาหน้าขวาหัก\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 311,
    title: "ราคาซ่อม DJI Air 3",
    triggers: ["dji air 3", "air3", " air 3 "],
    tags: ["repair-price", "air 3", "drone"],
    content:
      "ราคาซ่อม DJI Air 3 (จากสถิติ 51 งานจริง)\n\nช่วงราคา: 500 – 28,500 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- แจ้งเตือนแบตไม่แน่น\n- กิมบอลมีปัญหา\n- ระบบไฟฟ้าผิดพลาด\n- ปลายขาซ้ายหลังหัก\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 312,
    title: "ราคาซ่อม DJI Air 3S",
    triggers: ["air 3s", "air3s"],
    tags: ["repair-price", "air 3s", "drone"],
    content:
      "ราคาซ่อม DJI Air 3S (จากสถิติ 16 งานจริง)\n\nช่วงราคา: 500 – 23,300 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- เซ็นเซอร์หน้ามีปัญหา\n- ESC ผิดพลาด\n- ขามอเตอร์หลังซ้ายหัก\n- กิมบอลแตกร้าว\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 313,
    title: "ราคาซ่อม DJI Mavic 3 / Mavic 3 Classic / Mavic 3 Pro / Mavic 3 CINE",
    triggers: ["mavic 3", "mavic3", "mavic 3 classic", "mavic3classic", "mavic 3 pro", "mavic 3 cine"],
    tags: ["repair-price", "mavic 3", "drone"],
    content:
      "ราคาซ่อม DJI Mavic 3 series (จากสถิติ 52 งานจริง)\n\nช่วงราคา: 375 – 57,800 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- ตกกระแทก\n- บินชน — ESC ผิดพลาด\n- กิมบอลมีปัญหา / หลุด / แตก\n- ขาหน้า/หลังหัก\n\nหมายเหตุ: Mavic 3 เป็นรุ่นระดับสูง ค่าอะไหล่สูงกว่าโดรนทั่วไปครับ",
  },
  {
    id: 314,
    title: "ราคาซ่อม DJI Mavic 2 Pro / Mavic 2 Zoom",
    triggers: ["mavic 2 pro", "mavic2pro", "mavic 2 zoom", "mavic2zoom", "mavic 2"],
    tags: ["repair-price", "mavic 2", "drone"],
    content:
      "ราคาซ่อม DJI Mavic 2 Pro / Mavic 2 Zoom (จากสถิติ 213 งานจริง)\n\nช่วงราคา: 300 – 32,650 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- Calibrate Vision Sensor\n- บินชน ขาสกีหัก\n- กิมบอลมีปัญหา\n- กล้องเสีย / ภาพไม่ออก\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 315,
    title: "ราคาซ่อม DJI Phantom 4 / Phantom 4 Pro / Phantom 4 Pro V2",
    triggers: ["phantom 4", "phantom4", "phantom4pro", "phantom 4 pro"],
    tags: ["repair-price", "phantom 4", "drone"],
    content:
      "ราคาซ่อม DJI Phantom 4 series (จากสถิติ 328 งานจริง)\n\nช่วงราคา: 250 – 40,600 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- Camera sensor error\n- เครื่องตก / บินชน\n- Landing gear หัก\n- Gimbal ไม่ทำงาน / กล้องหัก\n\nหมายเหตุ: Phantom 4 เป็นรุ่นหนักและอะไหล่อาจหายากขึ้น",
  },
  {
    id: 316,
    title: "ราคาซ่อม DJI Spark / DJI Spark Fly More",
    triggers: ["dji spark", " spark "],
    tags: ["repair-price", "spark", "drone"],
    content:
      "ราคาซ่อม DJI Spark (จากสถิติ 213 งานจริง)\n\nช่วงราคา: 150 – 12,000 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- Gimbal motor overloaded\n- ตกน้ำ\n- บินชน\n- ESC Error\n\nคำแนะนำ: Spark เป็นรุ่นเก่า อาจต้องรออะไหล่นานขึ้นครับ",
  },
  {
    id: 317,
    title: "ราคาซ่อม DJI FPV",
    triggers: ["dji fpv", " fpv "],
    tags: ["repair-price", "fpv", "drone"],
    content:
      "ราคาซ่อม DJI FPV (จากสถิติ 58 งานจริง)\n\nช่วงราคา: 970 – 19,630 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- ขาหน้าขวาหัก\n- ตกน้ำ\n- Activate ไม่ได้\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 318,
    title: "ราคาซ่อม DJI Avata / DJI Neo / DJI Flip",
    triggers: ["dji avata", " avata", "dji neo", " neo ", "dji flip", " flip "],
    tags: ["repair-price", "avata", "neo", "flip", "drone"],
    content:
      "ราคาซ่อม DJI Avata / Neo / Flip (จากสถิติรวม)\n\nช่วงราคา:\n- Avata: 500 – 4,686 บาท\n- Neo: 300 – 1,500 บาท\n- Flip: 500 – 7,000 บาท\n\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- ESC Error\n- ตกน้ำ\n- กิมบอลมีปัญหา\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 319,
    title: "ราคาซ่อม DJI Osmo Pocket / Pocket 2 / Pocket 3",
    triggers: ["osmo pocket", "osmopocket", "pocket 2", "pocket2", "pocket 3", "pocket3"],
    tags: ["repair-price", "osmo pocket", "camera"],
    content:
      "ราคาซ่อม DJI Osmo Pocket series (จากสถิติ 341 งานจริง)\n\nช่วงราคา: 300 – 6,000 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- Gimbal protected / ไม่ทำงาน\n- เปิดเครื่องไม่ติด / ชาร์จไม่เข้า\n- กิมบอลติดขัด\n- จอเด้ง / จอไม่ดีดกลับ (Pocket 3)\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 320,
    title: "ราคาซ่อม DJI Osmo Action",
    triggers: ["osmo action", "osmoaction"],
    tags: ["repair-price", "osmo action", "camera"],
    content:
      "ราคาซ่อม DJI Osmo Action (จากสถิติ 109 งานจริง)\n\nช่วงราคา: 500 – 6,500 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- เปิดเครื่องไม่ติด\n- ชาร์จไฟไม่เข้า\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 321,
    title: "ราคาซ่อม DJI Osmo Mobile / OM4 / Ronin-S / Ronin-SC / RSC2 / RS2",
    triggers: ["osmo mobile", "osmomobile", "ronin-s", "ronin s", "ronins", "ronin-sc", "ronin sc", "roninsc", "rsc 2", "rsc2", "rs 2", " rs2 ", "dji om4", "om 4", "dji rs"],
    tags: ["repair-price", "ronin", "gimbal stabilizer", "osmo mobile"],
    content:
      "ราคาซ่อม DJI Gimbal Stabilizer series (จากสถิติรวม)\n\nช่วงราคา:\n- Osmo Mobile / OM4: ราคาแล้วแต่อาการ\n- Ronin-S: 2,500 – 9,420 บาท\n- Ronin-SC / RSC 2: 300 – 7,980 บาท\n- RS 2: 500 – 12,500 บาท\n\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- มอเตอร์ไม่ทำงาน\n- Gimbal ไม่ทำงาน / สะบัด\n- Phone holder หัก / ชำรุด\n- จอยสติ๊กค้าง\n\nคำแนะนำ: ราคาจริงขึ้นอยู่กับความเสียหายจากการตรวจสอบครับ",
  },
  {
    id: 322,
    title: "ราคาซ่อม DJI Inspire 1 / Inspire 2",
    triggers: ["inspire 1", "inspire1", "inspire 2", "inspire2"],
    tags: ["repair-price", "inspire", "drone"],
    content:
      "ราคาซ่อม DJI Inspire series (จากสถิติ 36 งานจริง)\n\nช่วงราคา:\n- Inspire 1 V2: 550 – 14,900 บาท\n- Inspire 2: 3,000 – 88,350 บาท\n\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nอาการที่พบบ่อย:\n- Gimbal error / กล้องพัง\n- ขาหัก\n- บินชน\n\nหมายเหตุ: Inspire เป็น Professional drone อะไหล่มีราคาสูงและอาจต้องรอนานขึ้น",
  },

  // ─── อาการยอดฮิต (Top Symptoms KB) ───

  {
    id: 401,
    title: "อาการ: ชาร์จไฟไม่เข้า / ชาร์จไม่เข้า",
    triggers: ["ชาร์จไฟไม่เข้า", "ชาร์จไม่เข้า", "ชาร์จแบตไม่เข้า", "ไฟไม่เข้า", "ชาร์จแล้วไม่เข้า", "plug แล้วไม่ชาร์จ"],
    tags: ["symptom", "charging", "repair"],
    content:
      "อาการ: ชาร์จไฟไม่เข้า (พบ 111 ครั้งจากสถิติจริง)\n\nช่วงราคาซ่อม: 300 – 9,800 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nสาเหตุที่พบบ่อย:\n1. พอร์ตชาร์จสกปรก/ชำรุด — ล้างและซ่อมพอร์ต\n2. แบตเตอรี่เสื่อม — เปลี่ยนแบต\n3. บอร์ดชาร์จเสีย — ซ่อม/เปลี่ยนบอร์ด\n\nคำถามคัดกรองก่อนประเมิน:\n- ลองเปลี่ยนสาย/ที่ชาร์จแล้วหรือยัง?\n- มีไฟสถานะขึ้นบนโดรนหรือไม่?\n- เคยตกหรือโดนน้ำมาก่อนไหม?\n\nส่งรูปพอร์ตชาร์จมาด้วยจะช่วยวินิจฉัยได้แม่นยิ่งขึ้นครับ",
  },
  {
    id: 402,
    title: "อาการ: กิมบอลไม่ทำงาน / กิมบอลมีปัญหา / กิมบอลติดขัด / กิมบอลสั่น",
    triggers: ["กิมบอลไม่ทำงาน", "กิมบอลมีปัญหา", "กิมบอลติดขัด", "กิมบอลสั่น", "กิมบอลหัก", "กิมบอลแตก", "gimbal stuck", "gimbal protected"],
    tags: ["symptom", "gimbal", "repair"],
    content:
      "อาการ: กิมบอลมีปัญหา (พบ 244 ครั้งจากสถิติจริง — อาการอันดับ 1)\n\nช่วงราคาซ่อม:\n- กิมบอลไม่ทำงาน: 300 – 17,500 บาท\n- กิมบอลหัก: 650 – 23,450 บาท\n- กิมบอลสั่น: 500 – 25,000 บาท\n\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nวิธีแก้เบื้องต้น (ก่อนส่งซ่อม):\n1. ตรวจว่าถอด Gimbal Protector ออกแล้วหรือยัง\n2. ทำ Gimbal Calibration ในแอป DJI Fly\n3. รีสตาร์ทโดรน\n\nถ้าทำแล้วยังมีอาการ → ต้องส่งซ่อมครับ\nส่งวิดีโออาการมาที่ LINE @dji13support",
  },
  {
    id: 403,
    title: "อาการ: เปิดไม่ติด / เปิดเครื่องไม่ติด",
    triggers: ["เปิดไม่ติด", "เปิดเครื่องไม่ติด", "เปิดไม่ได้", "สตาร์ทไม่ติด", "โดรนเปิดไม่ขึ้น", "กดเปิดแล้วไม่ขึ้น"],
    tags: ["symptom", "power", "repair"],
    content:
      "อาการ: เปิดเครื่องไม่ติด (พบ 67 ครั้งจากสถิติจริง)\n\nช่วงราคาซ่อม: 300 – 11,500 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nสาเหตุที่พบบ่อย:\n1. แบตเตอรี่หมด/เสีย — ชาร์จหรือเปลี่ยนแบต\n2. บอร์ดหลักเสีย — ซ่อมบอร์ด\n3. เคยตกน้ำ/กระแทก — ตรวจภายใน\n\nคำถามคัดกรอง:\n- ชาร์จแบตแล้วยังเปิดไม่ติดไหม?\n- มีไฟ LED กะพริบขึ้นบ้างไหม?\n- เคยตกหรือโดนน้ำมาก่อนไหม?\n\nส่งรูปสภาพโดรนมาด้วยครับ",
  },
  {
    id: 404,
    title: "อาการ: ตกน้ำ / ตกน้ำทะเล / เครื่องเปียก",
    triggers: ["ตกน้ำ", "ตกน้ำทะเล", "โดนน้ำ", "เปียกน้ำ", "จมน้ำ", "น้ำทะเล", "โดนฝนหนัก"],
    tags: ["symptom", "water-damage", "emergency", "repair"],
    content:
      "อาการ: ตกน้ำ (พบ 75 ครั้งจากสถิติจริง — เคสฉุกเฉินสูง)\n\nช่วงราคาซ่อม: 300 – 13,400 บาท (ตกน้ำทะเลสูงกว่า)\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\n⚠️ ทำทันทีที่เกิดเหตุ:\n1. ห้ามเปิดสวิตช์เด็ดขาด!\n2. ถอดแบตเตอรี่ออกทันที\n3. สลัดน้ำออก\n4. ซับน้ำด้วยผ้าแห้ง\n5. ใส่ถุงข้าวสาร/silica gel 24-48 ชั่วโมง\n6. นำมาให้ช่างตรวจโดยเร็ว\n\nน้ำทะเลอันตรายกว่าน้ำจืด เนื่องจากมีเกลือที่กัดกร่อนวงจรได้เร็ว\n\nมี DJI Care Refresh ไหม? อาจเคลมได้ครับ",
  },
  {
    id: 405,
    title: "อาการ: บินชน / ตกกระแทก / โดรนตก",
    triggers: ["บินชน", "ตกกระแทก", "โดรนตก", "ชนต้นไม้", "ชนกำแพง", "บินตกมา", "ตกมา", "ชนอะไรมา"],
    tags: ["symptom", "crash", "repair"],
    content:
      "อาการ: บินชน / โดรนตก (พบ 39 ครั้งจากสถิติจริง)\n\nช่วงราคาซ่อม: 300 – 57,800 บาท (ขึ้นอยู่กับรุ่นและความเสียหาย)\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nตรวจสอบเบื้องต้น:\n- มีควัน/กลิ่นไหม้ → ถอดแบตออกทันที!\n- ใบพัดแตก/หัก → อย่าบิน\n- Gimbal/กล้องผิดรูป\n- ขาหักหลายขา → โครงสร้างเสียหาย\n\nคำถามคัดกรอง:\n- ชนหนักแค่ไหน? มีอะไรหักเห็นชัดไหม?\n- โดรนยังเปิดติดไหม?\n- มี DJI Care Refresh ไหม?\n\nส่งรูปทุกมุมของโดรนมาที่ LINE @dji13support ครับ",
  },
  {
    id: 406,
    title: "อาการ: ขาหัก / ขามอเตอร์หัก / ขาโดรนหัก",
    triggers: ["ขาหัก", "ขามอเตอร์หัก", "ขาโดรนหัก", "ขาหน้าหัก", "ขาหลังหัก", "ขาขวาหัก", "ขาซ้ายหัก", "landing gear หัก", "ขาสกีหัก"],
    tags: ["symptom", "frame", "repair"],
    content:
      "อาการ: ขาหัก (พบรวมกว่า 120 ครั้งจากสถิติจริง)\n\nช่วงราคาซ่อม: 200 – 10,700 บาท (ขึ้นอยู่กับรุ่นและตำแหน่ง)\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nตำแหน่งที่พบบ่อย (เรียงลำดับ):\n1. ขาหลังซ้าย — พบบ่อยที่สุด\n2. ขาหลังขวา\n3. ขาหน้าขวา\n4. ขาหน้าซ้าย\n5. ขามอเตอร์หน้าซ้าย/ขวา\n\nแจ้งรุ่นโดรนและตำแหน่งขาที่หัก จะประเมินราคาได้ทันทีครับ",
  },
  {
    id: 407,
    title: "อาการ: Gimbal motor overload / Gimbal overloaded",
    triggers: ["gimbal motor overload", "gimbal overload", "gimbal overloaded", "gimbal motor overloaded"],
    tags: ["symptom", "gimbal", "error", "repair"],
    content:
      "อาการ: Gimbal Motor Overload (พบ 20 ครั้งจากสถิติจริง)\n\nช่วงราคาซ่อม: 500 – 28,750 บาท\nเวลาซ่อมเฉลี่ย: 7 วันทำการ\n\nวิธีแก้เบื้องต้น:\n1. ตรวจว่าถอด Gimbal Protector ออกหรือยัง\n2. ทำ Gimbal Calibration ในแอป DJI Fly\n3. รีสตาร์ทโดรน 1 ครั้ง\n4. ตรวจดูว่ามีสิ่งกีดขวาง Gimbal ไหม\n\nถ้าทำแล้วยังขึ้น Overload → มักหมายความว่า:\n- Gimbal Motor เสีย → ต้องเปลี่ยน\n- สาย Ribbon หัก → ต้องซ่อม\n\nส่งวิดีโออาการมาที่ LINE @dji13support ได้เลยครับ",
  },
  {
    id: 408,
    title: "อาการ: Activate ไม่ได้ / Cannot Activate / Activate Failed",
    triggers: ["activate ไม่ได้", "cannot activate", "activate failed", "แอคติเวทไม่ได้", "เปิดใช้งานล้มเหลว", "activation failed"],
    tags: ["symptom", "activation", "repair"],
    content:
      "อาการ: Activate ไม่ได้ (พบในหลายรุ่น)\n\nสาเหตุที่พบบ่อย:\n1. โดรนไม่ได้เชื่อมต่อ Internet ตอน Activate\n2. Serial Number ถูก Lock/Blacklisted\n3. Firmware เสียหาย\n4. โดรนเป็นสินค้านำเข้าจากต่างประเทศ (Region Lock)\n\nวิธีแก้เบื้องต้น:\n- ตรวจ Internet ให้เสถียร ก่อน Activate\n- ใช้ VPN เป็น Region ไทยในกรณี Region Lock\n- อัปเดต DJI Fly ให้เป็นเวอร์ชันล่าสุด\n\nถ้าแก้เองไม่ได้ → นำมาที่ร้านได้เลยครับ ฟรีตรวจสอบ\nLINE: @dji13support | โทร: 065-694-6155",
  },
  {
    id: 409,
    title: "อาการ: ESC Error / ESC ผิดพลาด",
    triggers: ["esc error", "esc ผิดพลาด", "esc failure", "esc n0"],
    tags: ["symptom", "esc", "error", "repair"],
    content:
      "อาการ: ESC Error / ESC ผิดพลาด\n\nสาเหตุที่พบบ่อย:\n- บอร์ด ESC ชำรุด (มักเกิดจากบินชน/ตกกระแทก)\n- มอเตอร์ขัดข้องทำให้ ESC โอเวอร์โหลด\n- น้ำเข้าบอร์ด ESC\n\nการซ่อม:\n- ต้องซ่อมหรือเปลี่ยนบอร์ด ESC\n- ราคาเริ่มต้น 2,000 บาท (ขึ้นอยู่กับรุ่น)\n\nไม่ควรบินต่อถ้าขึ้น ESC Error → เสี่ยงโดรนตกกลางอากาศ\nส่งรูป/วิดีโออาการมาที่ LINE @dji13support ได้เลยครับ",
  },
];

export function matchKnowledgeDoc(message: string): KnowledgeDoc | undefined {
  const lower = message.toLowerCase();
  return knowledgeDocs.find((d) =>
    d.triggers.some((t) => lower.includes(t.toLowerCase()))
  );
}
