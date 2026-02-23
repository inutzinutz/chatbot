"use client";

import { cn } from "@/lib/utils";
import {
  MessageCircle,
  MessagesSquare,
  BarChart3,
  Package,
  FileText,
  BookOpen,
  Heart,
  Zap,
  Settings,
  Globe,
  ChevronLeft,
  ChevronRight,
  Tag,
  Reply,
  Truck,
  ShieldCheck,
  CheckSquare,
  ChevronsUpDown,
  Battery,
  Plane,
  Wrench,
  LogOut,
  User,
  Activity,
  LineChart,
  Users,
  X,
  Kanban,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { businessUnitList } from "@/lib/businessUnits";

export type PageId =
  | "chat"
  | "live-chat"
  | "analytics"
  | "admin-monitor"
  | "monitoring"
  | "crm"
  | "kanban"
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

interface AuthUser {
  username: string;
  businessId: string;
  isSuperAdmin: boolean;
  allowedBusinessIds: string[];
}

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  businessId: string;
  onBusinessChange: (id: string) => void;
  authUser: AuthUser;
  onLogout: () => void;
  /** Mobile: controlled open state */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV_SECTIONS = [
  {
    title: "Main",
    items: [
      { id: "live-chat" as PageId, label: "Live Chat", icon: MessagesSquare },
      { id: "chat" as PageId, label: "AI Chat", icon: MessageCircle },
      { id: "crm" as PageId, label: "CRM Contacts", icon: Users },
      { id: "kanban" as PageId, label: "Sales Pipeline", icon: Kanban },
      { id: "analytics" as PageId, label: "Analytics", icon: BarChart3 },
      { id: "admin-monitor" as PageId, label: "Admin Monitor", icon: Activity },
      { id: "monitoring" as PageId, label: "Monitoring", icon: LineChart },
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

export default function Sidebar({
  activePage,
  onNavigate,
  businessId,
  onBusinessChange,
  authUser,
  onLogout,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [bizMenuOpen, setBizMenuOpen] = useState(false);
  const bizMenuRef = useRef<HTMLDivElement>(null);

  // Filter business list to allowed businesses only
  const allowedBusinesses = businessUnitList.filter((b) =>
    authUser.allowedBusinessIds.includes(b.id)
  );
  const canSwitchBusiness = allowedBusinesses.length > 1;

  const currentBiz = businessUnitList.find((b) => b.id === businessId) ?? businessUnitList[0];
  const BizIcon = currentBiz.icon === "battery" ? Battery : currentBiz.icon === "wrench" ? Wrench : Plane;

  // Close business switcher dropdown on outside click
  useEffect(() => {
    if (!bizMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (bizMenuRef.current && !bizMenuRef.current.contains(e.target as Node)) {
        setBizMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [bizMenuOpen]);

  // Close mobile sidebar on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onMobileClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen, onMobileClose]);

  const handleNavigate = (page: PageId) => {
    onNavigate(page);
    onMobileClose?.(); // auto-close on mobile after navigation
  };

  const navContent = (
    <nav
      className={cn(
        "flex flex-col bg-white border-r border-gray-200 h-full transition-all duration-300",
        // Desktop: normal flow, collapsible
        "hidden md:flex",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Business Switcher Header */}
      <div ref={bizMenuRef} className="relative border-b border-gray-100">
        <button
          onClick={() => !collapsed && canSwitchBusiness && setBizMenuOpen(!bizMenuOpen)}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-5 text-left transition-colors",
            !collapsed && canSwitchBusiness && "hover:bg-gray-50 cursor-pointer"
          )}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
            style={{
              background: `linear-gradient(135deg, ${currentBiz.primaryColor}, ${currentBiz.primaryColor}dd)`,
            }}
          >
            <BizIcon className="h-4.5 w-4.5" />
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-gray-900 truncate">
                  {currentBiz.name}
                </h1>
                <p className="text-[10px] text-gray-400 truncate">AI Chatbot</p>
              </div>
              {canSwitchBusiness && (
                <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              )}
            </>
          )}
        </button>

        {/* Business Dropdown */}
        {bizMenuOpen && !collapsed && canSwitchBusiness && (
          <div className="absolute left-2 right-2 top-full z-50 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            {allowedBusinesses.map((biz) => {
              const Icon = biz.icon === "battery" ? Battery : biz.icon === "wrench" ? Wrench : Plane;
              const isSelected = biz.id === businessId;
              return (
                <button
                  key={biz.id}
                  onClick={() => {
                    onBusinessChange(biz.id);
                    setBizMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors",
                    isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                  )}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{
                      background: `linear-gradient(135deg, ${biz.primaryColor}, ${biz.primaryColor}dd)`,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">{biz.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{biz.description}</p>
                  </div>
                  {isSelected && (
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  )}
                </button>
              );
            })}
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
                      onClick={() => handleNavigate(item.id)}
                      className={cn(
                        "relative flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {/* Active left-border accent */}
                      {isActive && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-indigo-600" />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-indigo-600" : "text-gray-400"
                        )}
                      />
                      {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                      {!collapsed && "badge" in item && item.badge && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-600 font-semibold">
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

      {/* User Info & Logout */}
      <div className="border-t border-gray-100 p-2 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <User className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-700 truncate">
                {authUser.username}
              </p>
              <p className="text-[10px] text-gray-400 truncate">
                {authUser.isSuperAdmin ? "Super Admin" : currentBiz.shortName}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          className={cn(
            "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

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

  // ── Mobile drawer (always w-[240px], no collapse) ──
  const mobileDrawer = (
    <>
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}
      {/* Drawer */}
      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-[240px] bg-white border-r border-gray-200",
          "transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        {/* Mobile header with close button */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
              style={{
                background: `linear-gradient(135deg, ${currentBiz.primaryColor}, ${currentBiz.primaryColor}dd)`,
              }}
            >
              <BizIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 truncate max-w-[140px]">{currentBiz.name}</p>
              <p className="text-[10px] text-gray-400">AI Chatbot</p>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3 space-y-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-4 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </p>
              <ul className="space-y-0.5 px-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handleNavigate(item.id)}
                        className={cn(
                          "relative flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-indigo-600" />
                        )}
                        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-600" : "text-gray-400")} />
                        <span className="flex-1 text-left">{item.label}</span>
                        {"badge" in item && item.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-600 font-semibold">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-2 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <User className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-700 truncate">{authUser.username}</p>
              <p className="text-[10px] text-gray-400">{authUser.isSuperAdmin ? "Super Admin" : currentBiz.shortName}</p>
            </div>
          </div>
          <button
            onClick={() => { onLogout(); onMobileClose?.(); }}
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  );

  return (
    <>
      {navContent}
      {mobileDrawer}
    </>
  );
}
