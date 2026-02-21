"use client";

import { useState } from "react";
import Sidebar, { type PageId } from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
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
import {
  Code,
  ExternalLink,
  Zap,
} from "lucide-react";

function SettingsPage() {
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
            Add this script to any website to embed the DJI 13 STORE chatbot
            widget.
          </p>
          <div className="rounded-lg bg-gray-900 p-4 text-xs text-green-400 font-mono overflow-x-auto">
            <pre>{`<script\n  src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js"\n  data-key="script_4x9xsyeyuk8"\n  data-droid-id="202"\n></script>`}</pre>
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
            Add{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded">
              OPENAI_API_KEY
            </code>{" "}
            to{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded">.env.local</code>{" "}
            for GPT-4o-mini streaming.
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
  const [activePage, setActivePage] = useState<PageId>("chat");

  const renderContent = () => {
    switch (activePage) {
      case "chat":
        return (
          <div className="flex-1 flex flex-col bg-gray-50/50 p-4">
            <div className="flex-1 overflow-hidden rounded-2xl border border-gray-200 shadow-lg shadow-gray-200/30 bg-white">
              <ChatWindow />
            </div>
          </div>
        );
      case "analytics":
        return <AnalyticsDashboard />;
      case "channels":
        return <ChannelsPage />;
      case "settings":
        return <SettingsPage />;
      case "products":
        return <ProductsPage />;
      case "sale-scripts":
        return <SaleScriptsPage />;
      case "knowledge":
        return <KnowledgePage />;
      case "intents":
        return <IntentsPage />;
      case "promotions":
        return <PromotionsPage />;
      case "quick-replies":
        return <QuickRepliesPage />;
      case "shipping":
        return <ShippingPage />;
      case "ai-inspector":
        return <AIInspector />;
      case "ai-testing":
        return <AITesting />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-dvh w-dvw overflow-hidden bg-gray-100">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      {renderContent()}
    </div>
  );
}
