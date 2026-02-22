"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Send,
  Bot,
  User,
  Shield,
  Clock,
  MessageCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Circle,
  Zap,
  Pin,
  PinOff,
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle,
  ShoppingCart,
  Wrench,
  Snowflake,
  FileText,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ChatConversation,
  ChatMessage,
  FollowUpResult,
} from "@/lib/chatStore";

interface LiveChatPageProps {
  businessId: string;
}

type FilterTab = "all" | "pinned" | "followup";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Priority badge colors
function priorityBadge(priority: string) {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-700 border-red-200";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "low":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

// Category icon + label
function categoryInfo(category: string) {
  switch (category) {
    case "unanswered":
      return { icon: AlertTriangle, label: "ยังไม่ได้ตอบ", color: "text-red-600" };
    case "purchase_intent":
      return { icon: ShoppingCart, label: "สนใจซื้อ", color: "text-emerald-600" };
    case "support_pending":
      return { icon: Wrench, label: "รอซัพพอร์ต", color: "text-orange-600" };
    case "cold_lead":
      return { icon: Snowflake, label: "สนทนาค้าง", color: "text-blue-600" };
    case "completed":
      return { icon: CheckCircle, label: "จบแล้ว", color: "text-gray-500" };
    default:
      return { icon: Circle, label: category, color: "text-gray-500" };
  }
}

export default function LiveChatPage({ businessId }: LiveChatPageProps) {
  // ── Existing state ──
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sending, setSending] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [globalBotEnabled, setGlobalBotEnabled] = useState(true);
  const [globalToggling, setGlobalToggling] = useState(false);

  // ── New state: Filter + Follow-up + Pin ──
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [followups, setFollowups] = useState<
    (FollowUpResult & { userId: string })[]
  >([]);
  const [scanning, setScanning] = useState(false);
  const [activeFollowup, setActiveFollowup] = useState<FollowUpResult | null>(
    null
  );
  const [editFollowupMsg, setEditFollowupMsg] = useState("");
  const [editingFollowup, setEditingFollowup] = useState(false);
  const [sendingFollowup, setSendingFollowup] = useState(false);

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const msgPollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch conversations ──
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/chat/admin?businessId=${encodeURIComponent(businessId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        setTotalUnread(data.totalUnread || 0);
        if (typeof data.globalBotEnabled === "boolean") {
          setGlobalBotEnabled(data.globalBotEnabled);
        }
      }
    } catch {
      // Silently fail on network errors
    }
  }, [businessId]);

  // ── Fetch messages for active conversation ──
  const fetchMessages = useCallback(async () => {
    if (!activeUserId) return;
    try {
      const res = await fetch(
        `/api/chat/admin?businessId=${encodeURIComponent(businessId)}&userId=${encodeURIComponent(activeUserId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.followup && data.followup.needsFollowup) {
          setActiveFollowup(data.followup);
          setEditFollowupMsg(data.followup.suggestedMessage || "");
        } else {
          setActiveFollowup(null);
          setEditFollowupMsg("");
        }
      }
    } catch {
      // Silently fail
    }
  }, [businessId, activeUserId]);

  // ── Fetch follow-ups ──
  const fetchFollowups = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/chat/admin?businessId=${encodeURIComponent(businessId)}&view=followups`
      );
      if (res.ok) {
        const data = await res.json();
        setFollowups(data.followups || []);
      }
    } catch {}
  }, [businessId]);

  // ── Polling ──
  useEffect(() => {
    fetchConversations();
    fetchFollowups();
    pollRef.current = setInterval(() => {
      fetchConversations();
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchConversations, fetchFollowups]);

  useEffect(() => {
    if (activeUserId) {
      fetchMessages();
      msgPollRef.current = setInterval(fetchMessages, 3000);
    }
    return () => {
      if (msgPollRef.current) clearInterval(msgPollRef.current);
    };
  }, [activeUserId, fetchMessages]);

  // ── Auto-scroll to bottom on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Mark as read when selecting conversation ──
  const selectConversation = async (userId: string) => {
    setActiveUserId(userId);
    setMessages([]);
    setActiveFollowup(null);
    setEditingFollowup(false);
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", businessId, userId }),
      });
      fetchConversations();
    } catch {}
  };

  // ── Send admin message ──
  const handleSend = async () => {
    if (!inputText.trim() || !activeUserId || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);

    const optimisticMsg: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "admin",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          businessId,
          userId: activeUserId,
          message: text,
        }),
      });
      await fetchMessages();
      await fetchConversations();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  // ── Toggle bot ──
  const handleToggleBot = async (userId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    setConversations((prev) =>
      prev.map((c) =>
        c.userId === userId ? { ...c, botEnabled: newEnabled } : c
      )
    );
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleBot",
          businessId,
          userId,
          enabled: newEnabled,
        }),
      });
      await fetchMessages();
      await fetchConversations();
    } catch {
      setConversations((prev) =>
        prev.map((c) =>
          c.userId === userId ? { ...c, botEnabled: currentEnabled } : c
        )
      );
    }
  };

  // ── Global bot toggle ──
  const handleGlobalToggle = async () => {
    if (globalToggling) return;
    const newEnabled = !globalBotEnabled;
    setGlobalToggling(true);
    setGlobalBotEnabled(newEnabled);
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "globalToggleBot",
          businessId,
          enabled: newEnabled,
        }),
      });
    } catch {
      setGlobalBotEnabled(!newEnabled);
    }
    setGlobalToggling(false);
  };

  // ── Pin / Unpin ──
  const handlePin = async (userId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.userId === userId
          ? { ...c, pinned: true, botEnabled: false }
          : c
      )
    );
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pin",
          businessId,
          userId,
          reason: "ปักหมุดโดยแอดมิน",
        }),
      });
      await fetchMessages();
      await fetchConversations();
    } catch {
      await fetchConversations();
    }
  };

  const handleUnpin = async (userId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.userId === userId ? { ...c, pinned: false } : c
      )
    );
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unpin", businessId, userId }),
      });
      await fetchMessages();
      await fetchConversations();
    } catch {
      await fetchConversations();
    }
  };

  // ── Scan Follow-ups ──
  const handleScanFollowups = async () => {
    setScanning(true);
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyzeFollowups", businessId }),
      });
      await fetchFollowups();
    } catch {}
    setScanning(false);
  };

  // ── Send Follow-up ──
  const handleSendFollowup = async (userId: string, message: string) => {
    if (!message.trim()) return;
    setSendingFollowup(true);
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendFollowup",
          businessId,
          userId,
          message: message.trim(),
        }),
      });
      setActiveFollowup(null);
      setEditingFollowup(false);
      await fetchFollowups();
      await fetchConversations();
      if (activeUserId === userId) await fetchMessages();
    } catch {}
    setSendingFollowup(false);
  };

  // ── Dismiss Follow-up ──
  const handleDismissFollowup = async (userId: string) => {
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismissFollowup",
          businessId,
          userId,
        }),
      });
      setActiveFollowup(null);
      await fetchFollowups();
    } catch {}
  };

  // ── Filtered conversations ──
  const pinnedCount = conversations.filter((c) => c.pinned).length;

  const filtered = (() => {
    let list = conversations;
    if (filterTab === "pinned") {
      list = list.filter((c) => c.pinned);
    }
    if (searchText) {
      list = list.filter(
        (c) =>
          c.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
          c.userId.toLowerCase().includes(searchText.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    return list;
  })();

  const activeConv = conversations.find((c) => c.userId === activeUserId);

  return (
    <div className="flex-1 flex bg-gray-50/50 overflow-hidden">
      {/* ── Left Panel: Conversation List ── */}
      <div className="w-[340px] flex flex-col bg-white border-r border-gray-200">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-bold text-gray-900">Live Chat</h2>
              {totalUnread > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold min-w-[18px] text-center">
                  {totalUnread}
                </span>
              )}
            </div>
            <button
              onClick={fetchConversations}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Global Bot Toggle */}
          <button
            onClick={handleGlobalToggle}
            disabled={globalToggling}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all mb-3 border",
              globalBotEnabled
                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
            )}
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span>Bot Auto-Reply</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  globalBotEnabled
                    ? "bg-green-200 text-green-800"
                    : "bg-red-200 text-red-800"
                )}
              >
                {globalBotEnabled ? "ON" : "OFF"}
              </span>
              {globalBotEnabled ? (
                <ToggleRight className="h-5 w-5" />
              ) : (
                <ToggleLeft className="h-5 w-5" />
              )}
            </div>
          </button>

          {/* Filter Tabs */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setFilterTab("all")}
              className={cn(
                "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                filterTab === "all"
                  ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent"
              )}
            >
              All ({conversations.length})
            </button>
            <button
              onClick={() => setFilterTab("pinned")}
              className={cn(
                "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1",
                filterTab === "pinned"
                  ? "bg-orange-100 text-orange-700 border border-orange-200"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent"
              )}
            >
              <Pin className="h-3 w-3" />
              Pinned ({pinnedCount})
            </button>
            <button
              onClick={() => {
                setFilterTab("followup");
                fetchFollowups();
              }}
              className={cn(
                "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1",
                filterTab === "followup"
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent"
              )}
            >
              <Sparkles className="h-3 w-3" />
              Follow-up ({followups.length})
            </button>
          </div>

          {/* Search */}
          {filterTab !== "followup" && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          )}
        </div>

        {/* Content based on tab */}
        <div className="flex-1 overflow-y-auto">
          {filterTab === "followup" ? (
            /* ── Follow-up List ── */
            <div className="p-3">
              <button
                onClick={handleScanFollowups}
                disabled={scanning}
                className={cn(
                  "flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all mb-3 border",
                  scanning
                    ? "bg-purple-50 text-purple-400 border-purple-200 cursor-wait"
                    : "bg-purple-600 text-white border-purple-600 hover:bg-purple-700"
                )}
              >
                <Sparkles
                  className={cn("h-4 w-4", scanning && "animate-spin")}
                />
                {scanning ? "Scanning..." : "Scan Conversations"}
              </button>

              {followups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Sparkles className="h-8 w-8 mb-2 text-gray-300" />
                  <p className="text-xs font-medium text-gray-500">
                    No follow-ups found
                  </p>
                  <p className="text-[10px] text-center mt-1">
                    Click &ldquo;Scan Conversations&rdquo; to analyze chats
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {followups.map((fu) => {
                    const catInfo = categoryInfo(fu.category);
                    const CatIcon = catInfo.icon;
                    return (
                      <button
                        key={fu.userId}
                        onClick={() => selectConversation(fu.userId)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border transition-all",
                          activeUserId === fu.userId
                            ? "bg-purple-50 border-purple-200"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-gray-900 truncate">
                            {fu.displayName}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase",
                              priorityBadge(fu.priority)
                            )}
                          >
                            {fu.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <CatIcon
                            className={cn("h-3 w-3", catInfo.color)}
                          />
                          <span
                            className={cn(
                              "text-[10px] font-medium",
                              catInfo.color
                            )}
                          >
                            {catInfo.label}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {timeAgo(fu.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 line-clamp-2">
                          {fu.reason}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : /* ── Conversation List (All / Pinned) ── */
          filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6">
              <MessageCircle className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">
                {filterTab === "pinned"
                  ? "No pinned conversations"
                  : "No conversations yet"}
              </p>
              <p className="text-xs text-center mt-1">
                {filterTab === "pinned"
                  ? "Pinned conversations will appear here"
                  : "Conversations will appear here when customers send messages via LINE"}
              </p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => selectConversation(conv.userId)}
                className={cn(
                  "flex items-start gap-3 w-full px-4 py-3 text-left border-b border-gray-50 transition-colors",
                  activeUserId === conv.userId
                    ? "bg-indigo-50/80"
                    : "hover:bg-gray-50"
                )}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {conv.pictureUrl ? (
                    <img
                      src={conv.pictureUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {/* Bot status indicator */}
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white flex items-center justify-center",
                      conv.botEnabled ? "bg-green-500" : "bg-orange-500"
                    )}
                  >
                    {conv.botEnabled ? (
                      <Bot className="h-2 w-2 text-white" />
                    ) : (
                      <User className="h-2 w-2 text-white" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {conv.pinned && (
                        <Pin className="h-3 w-3 text-orange-500 shrink-0" />
                      )}
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {conv.displayName}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                      {timeAgo(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500 truncate">
                      {conv.lastMessageRole === "admin" && (
                        <span className="text-indigo-500">You: </span>
                      )}
                      {conv.lastMessageRole === "bot" && (
                        <span className="text-green-600">Bot: </span>
                      )}
                      {conv.lastMessage}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold min-w-[18px] text-center shrink-0 ml-2">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  {/* Pinned reason */}
                  {conv.pinned && conv.pinnedReason && (
                    <p className="text-[10px] text-orange-500 mt-0.5 truncate">
                      {conv.pinnedReason}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right Panel: Chat Thread ── */}
      <div className="flex-1 flex flex-col bg-white">
        {!activeUserId ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageCircle className="h-16 w-16 mb-4 text-gray-200" />
            <p className="text-lg font-medium text-gray-500">
              Select a conversation
            </p>
            <p className="text-sm mt-1">
              Choose a customer from the list to start chatting
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                {activeConv?.pictureUrl ? (
                  <img
                    src={activeConv.pictureUrl}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {activeConv?.displayName || "Customer"}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span>LINE</span>
                    <Circle className="h-1 w-1 fill-current" />
                    <span className="font-mono">
                      {activeUserId.slice(0, 16)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {activeConv && (
                <div className="flex items-center gap-2">
                  {/* Pin / Unpin button */}
                  {activeConv.pinned ? (
                    <button
                      onClick={() => handleUnpin(activeConv.userId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition-all"
                      title="ถอดหมุด"
                    >
                      <PinOff className="h-3.5 w-3.5" />
                      <span>Unpin</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePin(activeConv.userId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-all"
                      title="ปักหมุด"
                    >
                      <Pin className="h-3.5 w-3.5" />
                      <span>Pin</span>
                    </button>
                  )}

                  {/* Bot Toggle */}
                  <button
                    onClick={() =>
                      handleToggleBot(activeConv.userId, activeConv.botEnabled)
                    }
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      activeConv.botEnabled
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                    )}
                  >
                    {activeConv.botEnabled ? (
                      <>
                        <ToggleRight className="h-4 w-4" />
                        <span>Bot ON</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-4 w-4" />
                        <span>Bot OFF</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Pinned Banner */}
            {activeConv?.pinned && (
              <div className="px-5 py-2 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
                <Pin className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-medium text-orange-700">
                  Pinned
                </span>
                {activeConv.pinnedReason && (
                  <>
                    <span className="text-orange-300">|</span>
                    <span className="text-xs text-orange-600">
                      {activeConv.pinnedReason}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Follow-up Action Card */}
            {activeFollowup && (
              <div className="px-5 py-3 bg-purple-50 border-b border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-700">
                      Follow-up Required
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase",
                        priorityBadge(activeFollowup.priority)
                      )}
                    >
                      {activeFollowup.priority}
                    </span>
                    {(() => {
                      const catInfo = categoryInfo(activeFollowup.category);
                      const CatIcon = catInfo.icon;
                      return (
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[10px] font-medium",
                            catInfo.color
                          )}
                        >
                          <CatIcon className="h-3 w-3" />
                          {catInfo.label}
                        </span>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() =>
                      handleDismissFollowup(activeUserId!)
                    }
                    className="p-1 rounded hover:bg-purple-100 text-purple-400 hover:text-purple-600 transition-colors"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-purple-600 mb-2">
                  {activeFollowup.reason}
                </p>
                {editingFollowup ? (
                  <div className="space-y-2">
                    <textarea
                      value={editFollowupMsg}
                      onChange={(e) => setEditFollowupMsg(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleSendFollowup(
                            activeUserId!,
                            editFollowupMsg
                          )
                        }
                        disabled={
                          !editFollowupMsg.trim() || sendingFollowup
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Send className="h-3 w-3" />
                        {sendingFollowup ? "Sending..." : "Send"}
                      </button>
                      <button
                        onClick={() => setEditingFollowup(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-xs text-gray-700 bg-white px-3 py-2 rounded-lg border border-purple-100 italic">
                      &ldquo;{activeFollowup.suggestedMessage}&rdquo;
                    </p>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() =>
                          handleSendFollowup(
                            activeUserId!,
                            activeFollowup.suggestedMessage
                          )
                        }
                        disabled={sendingFollowup}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-all"
                      >
                        <Send className="h-3 w-3" />
                        Send
                      </button>
                      <button
                        onClick={() => {
                          setEditFollowupMsg(
                            activeFollowup.suggestedMessage
                          );
                          setEditingFollowup(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/50">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  No messages yet
                </div>
              )}
              {messages.map((msg) => {
                const isCustomer = msg.role === "customer";
                const isBot = msg.role === "bot";
                const isAdmin = msg.role === "admin";
                const isSystem = isAdmin && msg.content.startsWith("[");

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2",
                      isAdmin ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Avatar for customer/bot */}
                    {!isAdmin && (
                      <div
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          isBot
                            ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                            : "bg-gradient-to-br from-gray-400 to-gray-500"
                        )}
                      >
                        {isBot ? (
                          <Bot className="h-3.5 w-3.5 text-white" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-white" />
                        )}
                      </div>
                    )}

                    {/* Bubble */}
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        isAdmin
                          ? "bg-indigo-600 text-white rounded-br-md"
                          : isBot
                          ? "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                          : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                      )}
                    >
                       {/* Admin sender name */}
                       {isAdmin && msg.sentBy && (
                         <div className="flex items-center gap-1 mb-1">
                           <span className="text-[10px] font-semibold text-indigo-200">
                             {msg.sentBy}
                           </span>
                         </div>
                       )}
                       {/* Role badge + Pipeline info */}
                       {isBot && (
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Bot className="h-3 w-3 text-indigo-500" />
                            <span className="text-[10px] font-semibold text-indigo-500">
                              Bot
                            </span>
                          </div>
                          {typeof msg.pipelineLayer === "number" && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                                msg.pipelineLayer <= 2
                                  ? "bg-slate-100 text-slate-600"
                                  : msg.pipelineLayer <= 5
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : msg.pipelineLayer <= 9
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : msg.pipelineLayer <= 11
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : msg.pipelineLayer <= 13
                                  ? "bg-orange-50 text-orange-700 border border-orange-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                              )}
                            >
                              <Zap className="h-2.5 w-2.5" />
                              L{msg.pipelineLayer}
                              {msg.pipelineLayerName && (
                                <span className="font-medium">
                                  {msg.pipelineLayerName}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Message content — image, file, or text */}
                      {msg.imageUrl ? (
                        <a
                          href={msg.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/img block relative"
                          title="คลิกเพื่อดูรูปขนาดเต็ม"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.imageUrl}
                            alt={msg.fileName || "รูปภาพ"}
                            className="max-h-56 max-w-full rounded-xl object-cover block"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 rounded-xl bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow" />
                          </div>
                          {msg.fileName && (
                            <p className="text-[10px] mt-1 text-gray-400">{msg.fileName}</p>
                          )}
                        </a>
                      ) : msg.fileName && !msg.imageUrl ? (
                        <div className="flex items-center gap-2 py-0.5">
                          <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                          <span className="text-sm break-all">{msg.fileName}</span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      )}
                      {/* Timestamp */}
                      <p
                        className={cn(
                          "text-[10px] mt-1",
                          isAdmin ? "text-indigo-200" : "text-gray-400"
                        )}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>

                     {/* Avatar + name for admin */}
                     {isAdmin && (
                       <div className="flex flex-col items-center gap-0.5">
                         <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shrink-0">
                           <Shield className="h-3.5 w-3.5 text-white" />
                         </div>
                         {msg.sentBy && (
                           <span className="text-[9px] text-gray-400 font-medium leading-none">
                             {msg.sentBy}
                           </span>
                         )}
                       </div>
                     )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    activeConv?.botEnabled
                      ? "Type a message... (Bot is auto-replying)"
                      : "Type a message to customer..."
                  }
                  className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  className={cn(
                    "p-2.5 rounded-xl transition-all",
                    inputText.trim() && !sending
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {activeConv?.botEnabled && (
                <p className="text-[10px] text-green-600 mt-1.5 flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  Bot is auto-replying to this customer. Turn off to reply
                  manually.
                </p>
              )}
              {activeConv && !activeConv.botEnabled && (
                <p className="text-[10px] text-orange-600 mt-1.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Bot is OFF. You are replying manually to this customer.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
