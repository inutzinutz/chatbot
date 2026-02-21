"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatWindow from "./ChatWindow";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      <div
        className={cn(
          "mb-4 overflow-hidden rounded-2xl shadow-2xl shadow-indigo-200/50 border border-gray-200 transition-all duration-300 origin-bottom-right",
          isOpen
            ? "w-[380px] h-[600px] scale-100 opacity-100"
            : "w-0 h-0 scale-0 opacity-0"
        )}
      >
        <ChatWindow />
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300",
          "hover:scale-110 active:scale-95",
          isOpen
            ? "bg-gray-700 text-white shadow-gray-300"
            : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-indigo-300"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
