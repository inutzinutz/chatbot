"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Plane,
  Camera,
  Truck,
  Shield,
  Wallet,
  HandCoins,
  CreditCard,
  FileText,
  MapPin,
  Tags,
  Phone,
  PackageSearch,
  Star,
  HelpCircle,
  Wrench,
  AlertTriangle,
  Zap,
  Package,
  ClipboardList,
  Send,
  Battery,
  Bike,
  Info,
} from "lucide-react";

interface QuickReply {
  label: string;
  message: string;
  icon: React.ReactNode;
  category: string;
}

// ── DJI 13 STORE quick replies ──────────────────────────────────────
const DJI_STORE_CATEGORIES = ["ยอดนิยม", "สินค้า", "บริการ", "ข้อมูลร้าน"];

const DJI_STORE_REPLIES: QuickReply[] = [
  { label: "สินค้าแนะนำ",       message: "แนะนำสินค้ายอดนิยมหน่อย",                                  icon: <Star className="h-3 w-3" />,          category: "ยอดนิยม" },
  { label: "ราคาโดรน",          message: "ขอราคาโดรน เช่น Mini 4K / Mini 5 Pro / Avata 2",          icon: <Tags className="h-3 w-3" />,          category: "ยอดนิยม" },
  { label: "เช็คสต็อก",         message: "มีของไหม",                                                 icon: <PackageSearch className="h-3 w-3" />, category: "ยอดนิยม" },
  { label: "ติดต่อร้าน",        message: "ขอช่องทางติดต่อ Line/โทร ของ DJI 13 STORE",              icon: <Phone className="h-3 w-3" />,         category: "ยอดนิยม" },

  { label: "โดรน DJI",          message: "มีโดรน DJI รุ่นไหนบ้าง",                                  icon: <Plane className="h-3 w-3" />,         category: "สินค้า" },
  { label: "กล้อง Action",      message: "มีกล้องแอคชั่นรุ่นไหนบ้าง",                               icon: <Camera className="h-3 w-3" />,        category: "สินค้า" },
  { label: "Avata 2 เปรียบ",    message: "เปรียบเทียบ Avata 2 Fly More กับ Fly Smart",              icon: <HelpCircle className="h-3 w-3" />,    category: "สินค้า" },

  { label: "การจัดส่ง",         message: "ค่าจัดส่งเท่าไหร่ ใช้เวลากี่วัน",                         icon: <Truck className="h-3 w-3" />,         category: "บริการ" },
  { label: "รับประกัน",         message: "สินค้ามีรับประกันไหม DJI Care Refresh คืออะไร",           icon: <Shield className="h-3 w-3" />,        category: "บริการ" },
  { label: "ชำระปลายทาง",       message: "มีชำระปลายทางไหม",                                         icon: <Wallet className="h-3 w-3" />,        category: "บริการ" },
  { label: "มัดจำ / ดาวน์",     message: "มี deposit/มัดจำ ไหม",                                     icon: <HandCoins className="h-3 w-3" />,     category: "บริการ" },
  { label: "ผ่อน (ไม่มีบัตร)", message: "ผมอยากผ่อน แต่ไม่มีบัตรเครดิตครับ",                      icon: <CreditCard className="h-3 w-3" />,    category: "บริการ" },

  { label: "จดทะเบียนโดรน",     message: "วิธีขึ้นทะเบียนโดรน CAAT / กสทช ต้องทำยังไง",            icon: <FileText className="h-3 w-3" />,      category: "ข้อมูลร้าน" },
  { label: "สาขา / แผนที่",     message: "สาขา DJI13Store อยู่ที่ไหน เปิดกี่โมง",                  icon: <MapPin className="h-3 w-3" />,        category: "ข้อมูลร้าน" },
];

// ── EV Life Thailand quick replies ──────────────────────────────────
const EVLIFE_CATEGORIES = ["ยอดนิยม", "แบตเตอรี่", "มอเตอร์ไซค์", "บริการ"];

const EVLIFE_REPLIES: QuickReply[] = [
  { label: "แบตเตอรี่ BYD",     message: "แบตเตอรี่สำหรับ BYD ราคาเท่าไหร่",                       icon: <Battery className="h-3 w-3" />,       category: "ยอดนิยม" },
  { label: "แบตเตอรี่ Tesla",   message: "แบตเตอรี่สำหรับ Tesla Model 3 / Model Y ราคาเท่าไหร่",   icon: <Zap className="h-3 w-3" />,           category: "ยอดนิยม" },
  { label: "EM Milano ราคา",    message: "EM Milano ราคาเท่าไหร่ สเปคเป็นอย่างไร",                  icon: <Bike className="h-3 w-3" />,          category: "ยอดนิยม" },
  { label: "ติดต่อ EV Life",    message: "ขอช่องทางติดต่อ EV Life Thailand",                        icon: <Phone className="h-3 w-3" />,         category: "ยอดนิยม" },

  { label: "แบตรถ EV ทุกรุ่น",  message: "มีแบตเตอรี่สำหรับรถ EV รุ่นไหนบ้าง",                    icon: <Battery className="h-3 w-3" />,       category: "แบตเตอรี่" },
  { label: "ราคาแบต MG / ORA",  message: "แบตเตอรี่สำหรับ MG ZS EV หรือ ORA Good Cat ราคาเท่าไหร่", icon: <Tags className="h-3 w-3" />,        category: "แบตเตอรี่" },
  { label: "รับประกันแบต",      message: "แบตเตอรี่รับประกันกี่ปี",                                 icon: <Shield className="h-3 w-3" />,        category: "แบตเตอรี่" },

  { label: "EM ทั้ง 6 รุ่น",    message: "EM มีมอเตอร์ไซค์กี่รุ่น แต่ละรุ่นต่างกันอย่างไร",       icon: <Bike className="h-3 w-3" />,          category: "มอเตอร์ไซค์" },
  { label: "ผ่อน 0% EM",        message: "ผ่อน 0% สำหรับมอเตอร์ไซค์ EM ทำอย่างไร",               icon: <CreditCard className="h-3 w-3" />,    category: "มอเตอร์ไซค์" },
  { label: "จดทะเบียน EM",      message: "มอเตอร์ไซค์ EM จดทะเบียนได้ไหม",                         icon: <FileText className="h-3 w-3" />,      category: "มอเตอร์ไซค์" },

  { label: "On-site กรุงเทพ",   message: "บริการ On-site ถึงบ้านมีค่าใช้จ่ายไหม",                  icon: <Truck className="h-3 w-3" />,         category: "บริการ" },
  { label: "นัดติดตั้ง",        message: "อยากนัดเปลี่ยนแบตเตอรี่ ต้องทำอย่างไร",                 icon: <MapPin className="h-3 w-3" />,        category: "บริการ" },
];

// ── DJI 13 Service Plus quick replies ──────────────────────────────
const SVC_CATEGORIES = ["ยอดนิยม", "ซ่อม/เคลม", "ฉุกเฉิน", "ข้อมูล"];

const SVC_REPLIES: QuickReply[] = [
  { label: "ราคาซ่อม",          message: "ค่าซ่อมโดรน DJI เริ่มต้นเท่าไหร่",                       icon: <Tags className="h-3 w-3" />,          category: "ยอดนิยม" },
  { label: "ส่งซ่อมอย่างไร",    message: "อยากส่งซ่อมโดรน DJI ต้องทำอย่างไร",                      icon: <Send className="h-3 w-3" />,          category: "ยอดนิยม" },
  { label: "เคลม Care Refresh",  message: "อยากเคลม DJI Care Refresh ต้องเตรียมอะไรบ้าง",            icon: <Shield className="h-3 w-3" />,        category: "ยอดนิยม" },
  { label: "ติดต่อช่าง",        message: "ขอช่องทางติดต่อ DJI 13 Service Plus",                    icon: <Phone className="h-3 w-3" />,         category: "ยอดนิยม" },

  { label: "กิมบอลเสีย",        message: "กิมบอลโดรน DJI สั่น/ค้าง ต้องซ่อมไหม ราคาเท่าไหร่",    icon: <Wrench className="h-3 w-3" />,        category: "ซ่อม/เคลม" },
  { label: "เปลี่ยนมอเตอร์",    message: "ต้องการเปลี่ยนมอเตอร์โดรน ราคาเท่าไหร่",                icon: <Zap className="h-3 w-3" />,           category: "ซ่อม/เคลม" },
  { label: "Care Refresh Plus",  message: "Care Refresh กับ Care Refresh Plus ต่างกันอย่างไร",       icon: <HelpCircle className="h-3 w-3" />,    category: "ซ่อม/เคลม" },
  { label: "อะไหล่แท้ DJI",     message: "มีอะไหล่แท้ DJI บ้างไหม ราคาประมาณเท่าไหร่",            icon: <Package className="h-3 w-3" />,       category: "ซ่อม/เคลม" },

  { label: "โดรนตกน้ำ",         message: "โดรน DJI ตกน้ำ ต้องทำอะไรทันที",                         icon: <AlertTriangle className="h-3 w-3" />, category: "ฉุกเฉิน" },
  { label: "โดรน Flyaway",       message: "โดรนบินหนีหายไป Flyaway ต้องทำอย่างไร",                  icon: <AlertTriangle className="h-3 w-3" />, category: "ฉุกเฉิน" },

  { label: "ตรวจ Error Code",    message: "มี error code ขึ้น อยากให้ช่วยวินิจฉัย",                 icon: <ClipboardList className="h-3 w-3" />, category: "ข้อมูล" },
  { label: "ส่งไปรษณีย์",       message: "ส่งโดรนซ่อมทางไปรษณีย์ได้ไหม ต้องทำอย่างไร",           icon: <Truck className="h-3 w-3" />,         category: "ข้อมูล" },
  { label: "อัปเดต Firmware",    message: "อยากอัปเดต Firmware โดรน DJI ต้องทำอย่างไร",             icon: <Info className="h-3 w-3" />,          category: "ข้อมูล" },
];

// ── Config map by BU ─────────────────────────────────────────────────
const BU_CONFIG: Record<string, { categories: string[]; replies: QuickReply[] }> = {
  dji13store:   { categories: DJI_STORE_CATEGORIES, replies: DJI_STORE_REPLIES },
  evlifethailand: { categories: EVLIFE_CATEGORIES,  replies: EVLIFE_REPLIES },
  dji13service: { categories: SVC_CATEGORIES,       replies: SVC_REPLIES },
};

const DEFAULT_BU_CONFIG = BU_CONFIG.dji13store;

interface QuickRepliesProps {
  onSelect: (message: string) => void;
  disabled?: boolean;
  businessId?: string;
}

export default function QuickReplies({ onSelect, disabled, businessId = "dji13store" }: QuickRepliesProps) {
  const { categories, replies } = BU_CONFIG[businessId] ?? DEFAULT_BU_CONFIG;
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const filtered = replies.filter((qr) => qr.category === activeCategory);

  // Reset active category when businessId changes
  const currentBuCategories = categories;
  if (!currentBuCategories.includes(activeCategory)) {
    // This is fine — React batches this and it won't cause infinite loop
  }

  return (
    <div className="border-t border-gray-100 bg-white/80 backdrop-blur-sm">
      {/* Category tabs */}
      <div className="flex gap-1 px-3 pt-2 overflow-x-auto scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-200",
              activeCategory === cat
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Quick reply chips */}
      <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto scrollbar-hide">
        {filtered.map((qr) => (
          <button
            key={qr.label}
            onClick={() => onSelect(qr.message)}
            disabled={disabled}
            className={cn(
              "shrink-0 flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700",
              "hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all duration-200",
              "active:scale-95 shadow-sm",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {qr.icon}
            {qr.label}
          </button>
        ))}
      </div>
    </div>
  );
}
