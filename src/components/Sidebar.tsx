"use client";

import { cn } from "@/lib/utils";
import {
  MessageCircle,
  BarChart3,
  Package,
  FileText,
  BookOpen,
  Heart,
  Zap,
  Settings,
  Globe,
  Bot,
  ChevronLeft,
  ChevronRight,
  Tag,
  Reply,
  Truck,
  ShieldCheck,
  CheckSquare,
} from "lucide-react";
import { useState } from "react";

export type PageId =
  | "chat"
  | "analytics"
  | "products"
  | "sale-scripts"
  | "knowledge"
  | "intents"
  | "promotions"
  | "quick-replies"
  | "shipping"
  | "ai-inspector"
  | "ai-testing"
  | "channels"
  | "settings";

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      { id: "chat" as PageId, label: "Chats", icon: MessageCircle },
      { id: "analytics" as PageId, label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Tuning AI",
    items: [
      { id: "products" as PageId, label: "Products", icon: Package },
      { id: "sale-scripts" as PageId, label: "Sale Scripts", icon: FileText },
      { id: "knowledge" as PageId, label: "Knowledge", icon: BookOpen },
      { id: "intents" as PageId, label: "Intents", icon: Heart },
      { id: "promotions" as PageId, label: "Promotions", icon: Tag, badge: "Beta" },
      { id: "quick-replies" as PageId, label: "Quick Replies", icon: Reply },
      { id: "shipping" as PageId, label: "Shipping Fee", icon: Truck, badge: "Beta" },
    ],
  },
  {
    title: "Usage",
    items: [
      { id: "ai-inspector" as PageId, label: "AI Inspector", icon: ShieldCheck },
      { id: "ai-testing" as PageId, label: "AI Testing", icon: CheckSquare },
    ],
  },
  {
    title: "Connections",
    items: [
      { id: "channels" as PageId, label: "Channels", icon: Globe },
      { id: "settings" as PageId, label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      className={cn(
        "flex flex-col bg-white border-r border-gray-200 transition-all duration-300 h-full",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-800 to-black text-white shadow-md">
          <Bot className="h-4.5 w-4.5" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-gray-900 truncate">
              DJI 13 STORE
            </h1>
            <p className="text-[10px] text-gray-400 truncate">AI Chatbot</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-4 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-sm"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-indigo-600" : "text-gray-400"
                        )}
                      />
                      {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                      {!collapsed && "badge" in item && item.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white text-indigo-600 font-medium border border-indigo-100">
                          {item.badge}
                        </span>
                      )}
                      {isActive && item.id === "chat" && !collapsed && (
                        <Zap className="h-3 w-3 text-amber-500" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Collapse Toggle */}
      <div className="border-t border-gray-100 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
}
