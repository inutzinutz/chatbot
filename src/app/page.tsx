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
import KanbanPage from "@/components/KanbanPage";
import LearnedDataPage from "@/components/LearnedDataPage";
import {
  Code,
  ExternalLink,
  Zap,
  Menu,
  Globe,
  Copy,
  Check,
} from "lucide-react";
import { getBusinessConfig } from "@/lib/businessUnits";
import { ToastContainer, PageWrapper } from "@/components/ui";

// ── Auth user type ──

interface AuthUser {
  username: string;
  businessId: string;
  isSuperAdmin: boolean;
  allowedBusinessIds: string[];
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative rounded-lg bg-gray-900 p-4 overflow-x-auto">
      <div className="absolute top-2 right-2">
        <CopyButton text={code} />
      </div>
      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap pr-8">{code}</pre>
    </div>
  );
}

function SettingsPage({ businessId }: { businessId: string }) {
  const config = getBusinessConfig(businessId);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-chatbot-domain.vercel.app";

  const bubbleSnippet = `<!-- DJI 13 STORE Chat Widget (Floating Bubble) -->
<script
  src="${origin}/widget.js"
  data-key="${businessId}"
  data-delay="4000"
  data-position="bottom-right">
</script>`;

  const inlineSnippet = `<!-- DJI 13 STORE Chat Widget (Inline Embed) -->
<div id="droidmind-chat" style="height:600px; width:100%; max-width:480px;"></div>
<script
  src="${origin}/widget.js"
  data-key="${businessId}"
  data-mode="inline"
  data-target="droidmind-chat">
</script>`;

  const wpBubbleSnippet = `// Paste in: Appearance → Theme Editor → functions.php
// OR use a plugin like "Insert Headers and Footers"
function droidmind_chat_widget() {
    ?>
    <script
      src="${origin}/widget.js"
      data-key="${businessId}"
      data-delay="4000"
      data-position="bottom-right">
    </script>
    <?php
}
add_action('wp_footer', 'droidmind_chat_widget');`;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500 mt-0.5">Embed widget & configuration</p>
        </div>

        {/* ── Website Connection ── */}
        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">เชื่อมต่อเว็บไซต์</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">www.dji13store.com</span>
          </div>

          {/* Bubble mode */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">1. Floating Bubble</span>
              <span className="text-[10px] text-gray-400">ปุ่มลอยมุมล่างขวา — แนะนำสำหรับทุกหน้า</span>
            </div>
            <CodeBlock code={bubbleSnippet} />
          </div>

          {/* Inline mode */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">2. Inline Embed</span>
              <span className="text-[10px] text-gray-400">ฝัง chat window ตรงในหน้า — เหมาะกับหน้า Contact / Support</span>
            </div>
            <CodeBlock code={inlineSnippet} />
          </div>
        </div>

        {/* ── WordPress Instructions ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">WordPress / WooCommerce</h3>
          </div>

          <div className="space-y-3 text-xs text-gray-600">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
              <p className="font-semibold text-blue-800">วิธีที่ง่ายที่สุด — Plugin</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>ติดตั้ง plugin <strong>"Insert Headers and Footers"</strong> (by WPCode)</li>
                <li>ไปที่ Settings → Insert Headers and Footers → Scripts in Footer</li>
                <li>วาง snippet &quot;Floating Bubble&quot; ด้านบน → Save</li>
              </ol>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-gray-700">วิธีที่ 2 — functions.php</p>
              <CodeBlock code={wpBubbleSnippet} />
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
              <p className="font-semibold text-amber-800 mb-1">หมายเหตุสำคัญ</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
                <li>ใส่ script ใน <strong>footer</strong> เท่านั้น (ไม่ใช่ header)</li>
                <li>ตรวจสอบว่า domain <code className="bg-amber-100 px-1 rounded">www.dji13store.com</code> ถูกต้อง</li>
                <li>ถ้าใช้ caching plugin (WP Super Cache, W3 Total Cache) ให้ clear cache หลัง install</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── AI Mode ── */}
        <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            AI Mode — {config.name}
          </h3>
          <p className="text-xs text-amber-700">
            ทำงานในโหมด <strong>Smart Pipeline</strong> (15 layers) + AI fallback
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-violet-50 rounded-lg p-2.5 border border-violet-100">
              <p className="font-semibold text-violet-800">Priority 1: Claude</p>
              <code className="text-violet-600 text-[10px]">ANTHROPIC_API_KEY</code>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
              <p className="font-semibold text-emerald-800">Priority 2: GPT-4o</p>
              <code className="text-emerald-600 text-[10px]">OPENAI_API_KEY</code>
            </div>
          </div>
        </div>

        {/* ── API Endpoints ── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-indigo-600" />
            API Endpoints
          </h3>
          <div className="space-y-2">
            {[
              { method: "POST", path: "/api/chat",      desc: "Send chat message" },
              { method: "GET",  path: "/api/analytics", desc: "Get analytics data" },
              { method: "GET",  path: "/api/products",  desc: "List/search products" },
            ].map((ep) => (
              <div key={ep.path} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-[10px] font-bold text-white bg-indigo-600 px-1.5 py-0.5 rounded">{ep.method}</span>
                <code className="text-xs text-gray-700 font-mono flex-1">{ep.path}</code>
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
          <PageWrapper className="p-4">
            <div className="h-full overflow-hidden rounded-2xl border border-gray-200 shadow-lg shadow-gray-200/30 bg-white">
              <ChatWindow key={businessId} businessId={businessId} />
            </div>
          </PageWrapper>
        );
      case "analytics":
        return (
          <PageWrapper className="p-6 bg-gray-50/50">
            <AnalyticsDashboard key={businessId} businessId={businessId} />
          </PageWrapper>
        );
      case "admin-monitor":
        return <AdminMonitorPage key={businessId} businessId={businessId} />;
      case "monitoring":
        return <MonitoringPage key={businessId} businessId={businessId} />;
      case "crm":
        return <CRMPage key={businessId} businessId={businessId} />;
      case "kanban":
        return <KanbanPage key={businessId} businessId={businessId} />;
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
      case "learned-data":
        return <LearnedDataPage key={businessId} businessId={businessId} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-dvh w-dvw overflow-hidden bg-gray-100">
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => { setActivePage(page); setMobileSidebarOpen(false); }}
        businessId={businessId}
        onBusinessChange={handleBusinessChange}
        authUser={authUser}
        onLogout={handleLogout}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      {/* Content area — flex-1 so it fills remaining width on desktop */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar with hamburger */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white md:hidden shrink-0">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-gray-800 capitalize">
            {activePage.replace("-", " ")}
          </span>
        </div>
        {/* Page content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {renderContent()}
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
