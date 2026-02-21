"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatWindow from "./ChatWindow";
import { DEFAULT_BUSINESS_ID } from "@/lib/businessUnits";

// Business-specific button colors
const BIZ_COLORS: Record<string, { from: string; to: string; shadow: string }> = {
  dji13store:     { from: "#ef4444", to: "#dc2626", shadow: "rgba(239,68,68,0.35)" },
  evlifethailand: { from: "#f97316", to: "#ea580c", shadow: "rgba(249,115,22,0.35)" },
};

const DEFAULT_COLOR = { from: "#7c3aed", to: "#4f46e5", shadow: "rgba(99,102,241,0.35)" };

interface ChatWidgetProps {
  businessId?: string;
  autoPopupDelay?: number; // ms; 0 = disabled; default 4000
  position?: "bottom-right" | "bottom-left";
}

export default function ChatWidget({
  businessId = DEFAULT_BUSINESS_ID,
  autoPopupDelay = 4000,
  position = "bottom-right",
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const prevOpenRef = useRef(false);

  // Auto-popup once per session
  useEffect(() => {
    if (autoPopupDelay <= 0) return;
    const key = `chatwidget_popped_${businessId}`;
    if (sessionStorage.getItem(key)) return;
    const t = setTimeout(() => {
      setIsOpen(true);
      sessionStorage.setItem(key, "1");
    }, autoPopupDelay);
    return () => clearTimeout(t);
  }, [autoPopupDelay, businessId]);

  // Clear unread badge when opening
  useEffect(() => {
    if (isOpen) setUnread(0);
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  const colors = BIZ_COLORS[businessId] ?? DEFAULT_COLOR;
  const positionClass = position === "bottom-left"
    ? "fixed bottom-6 left-6 z-50"
    : "fixed bottom-6 right-6 z-50";

  return (
    <div className={positionClass}>
      {/* Chat Window */}
      <div
        className={cn(
          "mb-4 overflow-hidden rounded-2xl shadow-2xl border border-gray-200 transition-all duration-300 origin-bottom-right",
          position === "bottom-left" && "origin-bottom-left",
          isOpen
            ? "w-[380px] h-[600px] scale-100 opacity-100"
            : "w-0 h-0 scale-0 opacity-0"
        )}
      >
        <ChatWindow businessId={businessId} />
      </div>

      {/* Toggle Button */}
      <div className="relative">
        {/* Unread badge */}
        {!isOpen && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center z-10 shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        <button
          onClick={() => setIsOpen((o) => !o)}
          aria-label={isOpen ? "Close chat" : "Open chat"}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300",
            "hover:scale-110 active:scale-95"
          )}
          style={{
            background: isOpen
              ? "#374151"
              : `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
            boxShadow: `0 8px 25px ${isOpen ? "rgba(55,65,81,0.3)" : colors.shadow}`,
            color: "white",
          }}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </button>
      </div>
    </div>
  );
}
