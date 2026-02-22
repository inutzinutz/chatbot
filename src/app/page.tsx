"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar, { type PageId } from "@/components/Sidebar";
import LoginPage from "@/components/LoginPage";
import ChatWindow from "@/components/ChatWindow";
import LiveChatPage from "@/components/LiveChatPage";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import AIInspector from "@/components/AIInspector";
import AITesting from "@/components/AITesting";
import ProductsPage from "@/components/ProductsPage";
import SaleScriptsPage from "@/components/SaleScriptsPage";
import KnowledgePage from "@/components/KnowledgePage";
import IntentsPage from "@/components/IntentsPage";
import PromotionsPage from "@/components/PromotionsPage";
import QuickRepliesPage from "@/components/QuickRepliesPage";
import ShippingPage from "@/components/ShippingPage";
import ChannelsPage from "@/components/ChannelsPage";
import AdminMonitorPage from "@/components/AdminMonitorPage";
import MonitoringPage from "@/components/MonitoringPage";
import CRMPage from "@/components/CRMPage";
import {
  Code,
  ExternalLink,
  Zap,
} from "lucide-react";
import { getBusinessConfig } from "@/lib/businessUnits";

// ── Auth user type ──

interface AuthUser {
  username: string;
  businessId: string;
  isSuperAdmin: boolean;
  allowedBusinessIds: string[];
}

function SettingsPage({ businessId }: { businessId: string }) {
  const config = getBusinessConfig(businessId);
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Configuration & embed instructions
          </p>
        </div>

        {/* Embed Widget */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-pink-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              Embed Widget
            </h3>
          </div>
          <p className="text-xs text-gray-500">
            Add this script to any website to embed the {config.name} chatbot
            widget.
          </p>
          <div className="rounded-lg bg-gray-900 p-4 text-xs text-green-400 font-mono overflow-x-auto">
            <pre>{`<script\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js"\n  data-key="${businessId}"\n  data-droid-id="${businessId}"\n></script>`}</pre>
          </div>
        </div>

        {/* API Mode */}
        <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            AI Mode
          </h3>
          <p className="text-xs text-amber-700">
            Currently running in <strong>Smart Fallback</strong> mode — no API
            key required.
          </p>
          <p className="text-xs text-amber-600">
            Priority 1: Add{" "}
            <code className="bg-violet-100 text-violet-700 px-1 py-0.5 rounded">
              ANTHROPIC_API_KEY
            </code>{" "}
            to{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded">.env.local</code>{" "}
            for Claude Sonnet streaming.
          </p>
          <p className="text-xs text-amber-600">
            Priority 2: Add{" "}
            <code className="bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded">
              OPENAI_API_KEY
            </code>{" "}
            to{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded">.env.local</code>{" "}
            for GPT-4o-mini streaming.
          </p>
          <p className="text-[10px] text-amber-500 mt-1">
            If no API keys are set, the system uses Smart Fallback (15-layer pipeline) automatically.
          </p>
        </div>

        {/* API Endpoints */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-indigo-600" />
            API Endpoints
          </h3>
          <div className="space-y-2">
            {[
              { method: "POST", path: "/api/chat", desc: "Send chat message" },
              {
                method: "GET",
                path: "/api/analytics",
                desc: "Get analytics data",
              },
              {
                method: "GET",
                path: "/api/products",
                desc: "List/search products",
              },
            ].map((ep) => (
              <div
                key={ep.path}
                className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2"
              >
                <span className="text-[10px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded">
                  {ep.method}
                </span>
                <code className="text-xs text-gray-700 font-mono flex-1">
                  {ep.path}
                </code>
                <span className="text-[10px] text-gray-400">{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [activePage, setActivePage] = useState<PageId>("live-chat");
  const [businessId, setBusinessId] = useState("");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // ── Check session on mount ──
  useEffect(() => {
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setAuthUser(data.user);
          setBusinessId(data.user.businessId);
        }
      })
      .catch(() => {
        // Not authenticated
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // ── Login handler ──
  const handleLogin = useCallback((user: AuthUser) => {
    setAuthUser(user);
    setBusinessId(user.businessId);
  }, []);

  // ── Logout handler ──
  const handleLogout = useCallback(async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthUser(null);
    setBusinessId("");
    setActivePage("live-chat");
  }, []);

  // ── Business change (super admin only) ──
  const handleBusinessChange = useCallback(
    (id: string) => {
      if (!authUser) return;
      if (authUser.isSuperAdmin || authUser.allowedBusinessIds.includes(id)) {
        setBusinessId(id);
      }
    },
    [authUser]
  );

  // ── Loading state ──
  if (!authChecked) {
    return (
      <div className="flex h-dvh w-dvw items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="h-8 w-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not authenticated → Login page ──
  if (!authUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activePage) {
      case "live-chat":
        return <LiveChatPage key={businessId} businessId={businessId} />;
      case "chat":
        return (
          <div className="flex-1 flex flex-col bg-gray-50/50 p-4">
            <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 shadow-lg shadow-gray-200/30 bg-white">
              <ChatWindow key={businessId} businessId={businessId} />
            </div>
          </div>
        );
      case "analytics":
        return <AnalyticsDashboard key={businessId} businessId={businessId} />;
      case "admin-monitor":
        return <AdminMonitorPage key={businessId} businessId={businessId} />;
      case "monitoring":
        return <MonitoringPage key={businessId} businessId={businessId} />;
      case "crm":
        return <CRMPage key={businessId} businessId={businessId} />;
      case "channels":
        return <ChannelsPage key={businessId} businessId={businessId} />;
      case "settings":
        return <SettingsPage businessId={businessId} />;
      case "products":
        return <ProductsPage key={businessId} businessId={businessId} />;
      case "sale-scripts":
        return <SaleScriptsPage key={businessId} businessId={businessId} />;
      case "knowledge":
        return <KnowledgePage key={businessId} businessId={businessId} />;
      case "intents":
        return <IntentsPage key={businessId} businessId={businessId} />;
      case "promotions":
        return <PromotionsPage key={businessId} businessId={businessId} />;
      case "quick-replies":
        return <QuickRepliesPage key={businessId} businessId={businessId} />;
      case "shipping":
        return <ShippingPage key={businessId} businessId={businessId} />;
      case "ai-inspector":
        return <AIInspector key={businessId} businessId={businessId} />;
      case "ai-testing":
        return <AITesting key={businessId} businessId={businessId} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-dvh w-dvw overflow-hidden bg-gray-100">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        businessId={businessId}
        onBusinessChange={handleBusinessChange}
        authUser={authUser}
        onLogout={handleLogout}
      />
      {renderContent()}
    </div>
  );
}
