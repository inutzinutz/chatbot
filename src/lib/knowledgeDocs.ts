export interface KnowledgeDoc {
  id: number;
  title: string;
  content: string;
  triggers: string[];
  tags: string[];
}

export const knowledgeDocs: KnowledgeDoc[] = [
  {
    id: 482,
    title: "สำหรับการ ขอใบอนุญาต, จดทะเบียนโดรน, ต่ออายุใบอนุญาต",
    triggers: [
      "จดทะเบียน",
      "ขึ้นทะเบียน",
      "ใบอนุญาต",
      "caat",
      "uas portal",
      "กสทช",
      "nbtc",
      "คท.30",
      "คท.26",
      "ต่ออายุ",
      "ใบอนุญาตบิน",
    ],
    tags: ["registration", "legal", "service"],
    content:
      "ขั้นตอนการดำเนินการใบอนุญาต (CAAT)\n- ลูกค้าต้องเข้าทำแบบทดสอบด้วยตนเอง ผ่าน UAS Portal: https://uasportal.caat.or.th/\n- ต้องทำแบบทดสอบให้ผ่าน (30/40) หากไม่ผ่านทำใหม่ได้หลัง 24 ชม\n- สิทธิ์การสอบ: ฟรี 1 ท่านแรก / ท่านที่ 2 ชำระเพิ่ม 200 บาท\n\nเอกสารจดทะเบียน (ตัวอย่าง)\nบุคคลทั่วไป: สำเนาบัตรประชาชน 2 ชุด + สำเนาทะเบียนบ้าน 1 ชุด\nนิติบุคคล/หน่วยงานรัฐ: มีชุดเอกสารเพิ่มเติม (หนังสือรับรอง, ภพ.20, แบบ คท.26/คท.30 ฯลฯ)\n\nระยะเวลา/อายุเอกสาร\n- ประกันภัย 1 ปี\n- ใบอนุญาต CAAT 2 ปี\n- เอกสาร กสทช. ไม่มีวันหมดอายุ\n\nติดต่อทีมเอกสาร\nLINE: @dji13service | โทร: 061-417-6005 | ที่อยู่: 616/6 ถนนลาดปลาเค้า แขวงจรเข้บัว เขตลาดพร้าว กรุงเทพฯ 10230",
  },
  {
    id: 607,
    title: "ราคาสินค้า ประเภทโดรน",
    triggers: [
      "ราคาโดรน",
      "ราคาสินค้า",
      "mini 4k",
      "dji flip",
      "dji neo",
      "mini 4 pro",
      "mini 5 pro",
      "air 3s",
      "mavic 4 pro",
      "avata 2 ราคา",
    ],
    tags: ["pricing", "drone"],
    content:
      "ราคาสินค้า ประเภทโดรน (บางรายการ)\n- DJI Mini 4K: 9,990 | Fly More: 14,090\n- DJI Flip: 12,900 | (DJI RC 2): 18,900 | Fly More (DJI RC 2): 23,900\n- DJI Neo: 6,600 | Fly More: 11,700 | Neo Motion Fly More: 17,399\n- DJI Mini 4 Pro: 21,850 | (DJI RC 2): 26,950 | Fly More (DJI RC 2): 29,750 | Fly More Plus (DJI RC 2): 31,790\n- DJI Mini 5 Pro: 25,690 | Fly More (RC-N3): 31,690 | Fly More (RC2): 34,990 | Fly More Plus (RC2): 37,390\n- DJI Air 3S (RC-N3): 34,990 | Fly More (RC-N3): 43,900 | Fly More (RC2): 49,900\n- DJI Mavic 4 Pro: 73,990 | Fly More (RC2): 90,500 | 512GB Creator (RC Pro 2): 120,490\n- DJI Avata 2 (Drone Only): 14,900 | Fly More (Single): 29,900 | Fly More (Three): 34,600",
  },
  {
    id: 608,
    title: "ราคาสินค้า ประเภทกล้อง",
    triggers: [
      "ราคากล้อง",
      "osmo mobile",
      "osmo 360",
      "osmo nano",
      "pocket 3",
      "action 5 pro ราคา",
      "rs 4 ราคา",
    ],
    tags: ["pricing", "camera", "gimbal"],
    content:
      "ราคาสินค้า ประเภทกล้อง/กิมบอล (บางรายการ)\n- DJI Osmo Mobile 7: 2,330 | Osmo Mobile 7P: 3,890\n- DJI Osmo 360 Standard: 14,290 | Adventure: 18,090\n- DJI OSMO NANO Standard (64GB): 9,300 | (128GB): 10,700\n- DJI Osmo Pocket 3: 17,900 | Creator Combo: 21,900\n- DJI Osmo Action 5 Pro Standard: 14,000 | Adventure: 16,900\n- DJI RS 4 Mini: 10,590 | Mini Combo: 13,000 | RS 4: 13,600 | RS 4 Combo: 17,850 | RS 4 Pro: 29,000 | RS 4 Pro Combo: 37,000",
  },
  {
    id: 481,
    title: "การขอใบเสนอราคา",
    triggers: ["ใบเสนอราคา", "quotation", "ใบกำกับ", "ภาษี", "เลขผู้เสียภาษี"],
    tags: ["billing", "quotation"],
    content:
      "ข้อมูลที่จำเป็นสำหรับใบเสนอราคา\n- ชื่อบริษัท/นามนิติบุคคล\n- ที่ตั้งบริษัท\n- เลขประจำตัวผู้เสียภาษี\n- ชื่อผู้ติดต่อ / เบอร์ / อีเมล\n- รุ่นสินค้าที่ต้องการเสนอราคา\n\nเงื่อนไขการสั่งซื้อโดรน\n- ต้องชำระเงินล่วงหน้า เพื่อออกใบเสร็จ/ใบกำกับภาษี สำหรับนำไปจดทะเบียนกับ กสทช.\n- ยังไม่สามารถส่งมอบเครื่องได้ทันที จนกว่าจะทำเอกสารตามขั้นตอนครบ\n\nติดต่อทีมเอกสาร: LINE @dji13service",
  },
  {
    id: 390,
    title: "สาขา DJI13Store",
    triggers: ["สาขา", "หน้าร้าน", "ที่อยู่", "แผนที่", "เปิดกี่โมง", "เวลาเปิด", "service center"],
    tags: ["location", "store"],
    content:
      "สาขาอยู่ที่ ราชพฤกษ์ และ ลาดปลาเค้า\n- ฝ่ายขาย (โดรนถ่ายภาพทั่วไป): 065-694-6155 | เวลา 10:00–18:30 (เปิดทุกวัน)\n- Service Center ลาดปลาเค้า: 098-950-5565 | แผนที่: https://goo.gl/maps/fq29jWumxJ1ZbADX9\n- Service Center ราชพฤกษ์: 061-417-5682 | แผนที่: https://goo.gl/maps/HerkUFs9H8yxEjs76\n\nแนะนำโทรเช็คสต็อกก่อนเดินทาง",
  },
  {
    id: 492,
    title: "วิธีป้องกันโดรนและแบตเตอรี่ DJI ร้อนเกินไป",
    triggers: ["ร้อน", "overheated", "เครื่องร้อน", "แบตร้อน", "aircraft overheated"],
    tags: ["support", "overheat"],
    content:
      "แนวทางป้องกันโดรน/แบตร้อน\n- หลีกเลี่ยงการเปิดเครื่องค้างไว้โดยไม่บิน\n- หากขึ้นข้อความ “Aircraft Overheated” ให้ลงจอดและปิดเครื่อง พักให้เย็นก่อนใช้งานต่อ\n- หลังบินพักแบต ~30 นาทีให้เย็นก่อนชาร์จ\n- ชาร์จในที่อากาศถ่ายเท อุณหภูมิ 5–40°C\n- โดรนซีรีส์ Mini ไม่มีพัดลม อาจรู้สึกร้อนกว่าปกติ",
  },
  {
    id: 501,
    title: "คำถามที่พบบ่อยเกี่ยวกับการชาร์จโดรนกล้อง DJI",
    triggers: ["ชาร์จ", "ชาร์จช้า", "ชาร์จไม่เข้า", "pd", "pps", "qc", "ที่ชาร์จ", "power delivery"],
    tags: ["support", "charging"],
    content:
      "FAQ การชาร์จโดรนกล้อง DJI\n- แนะนำใช้ที่ชาร์จ DJI แท้ และตรวจสอบโปรโตคอล PD/PPS/QC ให้ตรงรุ่น\n- ถ้าชาร์จไม่เต็ม: ตรวจระดับแบต (95%+ อาจเป็นระบบกันชาร์จเกิน), ลองถอด-ใส่ใหม่\n- อุณหภูมิที่เหมาะสม 5–40°C\n- ถ้าหนาวจัด: เสียบแบตกับโดรน เปิดเครื่องค้าง 5 นาทีให้อุ่นก่อนชาร์จ\n- ถ้าร้อนจัด: หลังบินพักอย่างน้อย 10 นาทีก่อนชาร์จ",
  },
];

export function matchKnowledgeDoc(message: string): KnowledgeDoc | undefined {
  const lower = message.toLowerCase();
  return knowledgeDocs.find((d) =>
    d.triggers.some((t) => lower.includes(t.toLowerCase()))
  );
}
