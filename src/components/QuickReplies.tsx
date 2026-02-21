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
} from "lucide-react";

interface QuickReply {
  label: string;
  message: string;
  icon: React.ReactNode;
  category: string;
}

const CATEGORIES = ["ยอดนิยม", "สินค้า", "บริการ", "ข้อมูลร้าน"];

const quickReplies: QuickReply[] = [
  { label: "สินค้าแนะนำ", message: "แนะนำสินค้ายอดนิยมหน่อย", icon: <Star className="h-3 w-3" />, category: "ยอดนิยม" },
  { label: "ราคาโดรน", message: "ขอราคาโดรน เช่น Mini 4K / Mini 5 Pro / Avata 2", icon: <Tags className="h-3 w-3" />, category: "ยอดนิยม" },
  { label: "เช็คสต็อก", message: "มีของไหม", icon: <PackageSearch className="h-3 w-3" />, category: "ยอดนิยม" },
  { label: "ติดต่อร้าน", message: "ขอช่องทางติดต่อ Line/โทร ของ DJI 13 STORE", icon: <Phone className="h-3 w-3" />, category: "ยอดนิยม" },

  { label: "โดรน DJI", message: "มีโดรน DJI รุ่นไหนบ้าง", icon: <Plane className="h-3 w-3" />, category: "สินค้า" },
  { label: "กล้อง Action", message: "มีกล้องแอคชั่นรุ่นไหนบ้าง", icon: <Camera className="h-3 w-3" />, category: "สินค้า" },
  { label: "Avata 2 เปรียบเทียบ", message: "เปรียบเทียบ Avata 2 Fly More กับ Fly Smart", icon: <HelpCircle className="h-3 w-3" />, category: "สินค้า" },

  { label: "การจัดส่ง", message: "ค่าจัดส่งเท่าไหร่ ใช้เวลากี่วัน", icon: <Truck className="h-3 w-3" />, category: "บริการ" },
  { label: "รับประกัน", message: "สินค้ามีรับประกันไหม DJI Care Refresh คืออะไร", icon: <Shield className="h-3 w-3" />, category: "บริการ" },
  { label: "ชำระปลายทาง", message: "มีชำระปลายทางไหม", icon: <Wallet className="h-3 w-3" />, category: "บริการ" },
  { label: "มัดจำ / ดาวน์", message: "มี deposit/มัดจำ ไหม", icon: <HandCoins className="h-3 w-3" />, category: "บริการ" },
  { label: "ผ่อน (ไม่มีบัตร)", message: "ผมอยากผ่อน แต่ไม่มีบัตรเครดิตครับ", icon: <CreditCard className="h-3 w-3" />, category: "บริการ" },

  { label: "จดทะเบียนโดรน", message: "วิธีขึ้นทะเบียนโดรน CAAT / กสทช ต้องทำยังไง", icon: <FileText className="h-3 w-3" />, category: "ข้อมูลร้าน" },
  { label: "สาขา / แผนที่", message: "สาขา DJI13Store อยู่ที่ไหน เปิดกี่โมง", icon: <MapPin className="h-3 w-3" />, category: "ข้อมูลร้าน" },
];

interface QuickRepliesProps {
  onSelect: (message: string) => void;
  disabled?: boolean;
}

export default function QuickReplies({ onSelect, disabled }: QuickRepliesProps) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const filtered = quickReplies.filter((qr) => qr.category === activeCategory);

  return (
    <div className="border-t border-gray-100 bg-white/80 backdrop-blur-sm">
      {/* Category tabs */}
      <div className="flex gap-1 px-3 pt-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
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
