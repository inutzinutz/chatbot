export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export const faqData: FAQItem[] = [
  {
    question: "Support @ DJI 13 Store คืออะไร",
    answer: "Support @ DJI 13 Store เป็นศูนย์บริการซ่อมและเคลมโดรน DJI อย่างเป็นทางการ ภายใต้ DJI 13 STORE รับซ่อมโดรน DJI ทุกรุ่น ดำเนินการเคลม DJI Care Refresh มีอะไหล่แท้ DJI และทีมช่างผู้เชี่ยวชาญโดยเฉพาะ",
    category: "ทั่วไป",
  },
  {
    question: "รับซ่อมโดรน DJI รุ่นอะไรบ้าง",
    answer: "รับซ่อมโดรน DJI ทุกรุ่นครับ:\n- DJI Mini (Mini 2, Mini 3, Mini 3 Pro, Mini 4 Pro)\n- DJI Air (Air 2S, Air 3)\n- DJI Mavic (Mavic 3, Mavic 3 Pro, Mavic 3 Classic)\n- DJI Avata (Avata, Avata 2)\n- DJI Phantom (Phantom 4 Pro, Phantom 4 RTK)\n- DJI Enterprise (Matrice, Agras)\n- กล้องแอคชั่น Osmo Action\n- กิมบอล Osmo Mobile",
    category: "บริการซ่อม",
  },
  {
    question: "ขั้นตอนการส่งซ่อมโดรนเป็นอย่างไร",
    answer: "ขั้นตอนการส่งซ่อม:\n1. แจ้งอาการทาง LINE @dji13support หรือโทร 065-694-6155\n2. ส่งภาพ/วิดีโออาการ (ถ้ามี)\n3. ทีมช่างประเมินราคาเบื้องต้น (ฟรี)\n4. ยืนยันดำเนินการ → นำมาที่ร้านหรือส่งไปรษณีย์\n5. ช่างซ่อมแล้วแจ้งผล\n6. ชำระค่าซ่อม → รับโดรนกลับ",
    category: "บริการซ่อม",
  },
  {
    question: "ค่าซ่อมโดรน DJI ราคาเท่าไหร่",
    answer: "ราคาซ่อมเบื้องต้น (ไม่รวมอะไหล่):\n- ประเมิน/วินิจฉัย: ฟรี\n- เปลี่ยนใบพัด: เริ่ม 300 บาท\n- เปลี่ยนมอเตอร์: เริ่ม 800 บาท\n- ซ่อม Gimbal/กล้อง: เริ่ม 1,500 บาท\n- ซ่อมบอร์ด ESC/FC: เริ่ม 2,000 บาท\n- เปลี่ยน Shell: เริ่ม 600 บาท\n\nราคาจริงขึ้นอยู่กับรุ่นและความเสียหาย ต้องประเมินก่อนยืนยันครับ",
    category: "บริการซ่อม",
  },
  {
    question: "ส่งโดรนมาซ่อมทางไปรษณีย์ได้ไหม",
    answer: "ได้เลยครับ! แจ้ง LINE @dji13support ก่อนส่งทุกครั้ง\n\nวิธีแพ็คโดรนให้ปลอดภัย:\n- ถอดใบพัดออก\n- ใส่ Gimbal Protector\n- ห่อ Bubble Wrap หนาๆ\n- ใส่กล่องแข็ง + เติม Packing\n- แนะนำ Kerry/Flash Express\n\nค่าส่งคืน: ลูกค้าออกค่าส่งกลับครับ",
    category: "บริการซ่อม",
  },
  {
    question: "DJI Care Refresh คืออะไร ต่างจากประกันร้านยังไง",
    answer: "DJI Care Refresh คือประกันอุบัติเหตุเพิ่มเติมจาก DJI:\n- ครอบคลุมการชน ตกน้ำ ความเสียหายจากอุบัติเหตุ\n- DJI Care Refresh Plus: ครอบคลุม Flyaway (บินหนี/สูญหาย)\n- ต้องซื้อภายใน 48 ชั่วโมงหลังเปิดกล่อง หรือ 1 ปี\n\nประกันร้าน DJI 13 STORE:\n- รับประกัน 1 ปี ชำรุดจากการผลิต\n- ไม่ครอบคลุมอุบัติเหตุ\n\nแนะนำซื้อ DJI Care Refresh เพิ่มเติมครับ!",
    category: "เคลมประกัน",
  },
  {
    question: "โดรนตกน้ำต้องทำอะไรก่อน",
    answer: "ทำตามขั้นตอนนี้ทันทีครับ:\n1. ถอดแบตเตอรี่ออกทันที (ห้ามเปิดเครื่อง!)\n2. สลัดน้ำออกให้มากที่สุด\n3. ใช้ผ้าแห้งซับน้ำรอบนอก\n4. ใส่ถุงข้าวสาร/silica gel ทิ้งไว้ 48 ชั่วโมง\n5. นำมาให้ช่างตรวจภายใน\n\nห้ามชาร์จ ห้ามเปิดเครื่องเด็ดขาดก่อนช่างตรวจ!",
    category: "ฉุกเฉิน",
  },
  {
    question: "โดรนสูญหาย/บินหนี (Flyaway) ต้องทำอะไร",
    answer: "ทำทันทีครับ:\n1. ใช้ DJI Fly → 'Find My Drone' ดูพิกัดสุดท้าย\n2. ตรวจ Flight Record ในแอป\n3. บันทึก Flight Log ไว้ก่อน!\n\nถ้ามี DJI Care Refresh Plus:\n- ส่ง Flight Log + หลักฐานให้ทีมงาน\n- ทีมช่วยยื่นเรื่อง Flyaway Claim\n\nติดต่อ LINE @dji13support ด่วนครับ!",
    category: "ฉุกเฉิน",
  },
  {
    question: "ช่างสามารถดู Flight Log ได้อย่างไร",
    answer: "วิธีดึง Flight Log:\n\nDJI Fly App:\n1. เปิดแอป → เมนูโปรไฟล์ (มุมขวาบน)\n2. เลือก 'Flight Records'\n3. เลือก Flight ที่ต้องการ → Export/แชร์\n\nDJI Assistant 2 (PC/Mac):\n1. เชื่อมต่อโดรนผ่าน USB\n2. เลือก Flight Records → Export\n\nส่งไฟล์ Log พร้อมอธิบายอาการมาที่ LINE @dji13support ครับ\nบริการวิเคราะห์ Log: 300 บาท",
    category: "ช่างซ่อม",
  },
  {
    question: "วิธีทำ Compass Calibration ที่ถูกต้อง",
    answer: "วิธี Compass Calibration:\n1. ไปในพื้นที่โล่ง ห่างจากโลหะขนาดใหญ่\n2. ห่างสนามแม่เหล็ก/ตึกคอนกรีต\n3. เปิดแอป DJI Fly → Safety → Compass Calibration\n4. หมุนโดรนตามที่แอปบอก (ตั้งตรง + นอนราบ)\n5. รอสัญญาณ Calibration สำเร็จ\n\nถ้า Calibrate แล้วยัง Error → ต้องซ่อมวงจร Compass",
    category: "ช่างซ่อม",
  },
  {
    question: "สอบถามสถานะการซ่อมได้อย่างไร",
    answer: "ติดต่อทีมงานโดยตรงครับ:\n- LINE: @dji13support\n- โทร: 065-694-6155\n- เวลาทำการ: จันทร์-เสาร์ 9:00-18:00 น.\n\nแจ้งชื่อและเบอร์โทรที่ใช้ลงทะเบียนซ่อมด้วยครับ จะได้รับข้อมูลรวดเร็วขึ้น",
    category: "บริการซ่อม",
  },
  {
    question: "มีอะไหล่ DJI แท้ขายไหม",
    answer: "มีอะไหล่แท้ DJI จำหน่ายครับ:\n- ใบพัด: เริ่ม 350 บาท/คู่\n- มอเตอร์: เริ่ม 1,200 บาท/ตัว\n- แบตเตอรี่: เริ่ม 1,800 บาท\n- Shell ตัวถัง: เริ่ม 450 บาท\n\nราคาขึ้นอยู่กับรุ่นโดรน สอบถาม LINE @dji13support พร้อมแจ้งรุ่นโดรนครับ",
    category: "อะไหล่",
  },
];

export function searchFAQ(query: string): FAQItem[] {
  const lowerQuery = query.toLowerCase();
  return faqData.filter(
    (f) =>
      f.question.toLowerCase().includes(lowerQuery) ||
      f.answer.toLowerCase().includes(lowerQuery) ||
      f.category.toLowerCase().includes(lowerQuery)
  );
}
