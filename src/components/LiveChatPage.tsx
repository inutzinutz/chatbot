"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CRMPanel from "@/components/CRMPanel";
import { PlatformBadge } from "@/components/ui";
import type {
  ChatConversation,
  ChatMessage,
  FollowUpResult,
  QuickReplyTemplate,
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

  // ── Full-text search state ──
  const [searchResults, setSearchResults] = useState<{
    userId: string; displayName: string; pictureUrl?: string;
    lastMessage: string; lastMessageAt: number; snippet?: string; pinned?: boolean; botEnabled: boolean;
  }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── CRM Notes state ──
  const [notes, setNotes] = useState<import("@/lib/chatStore").CRMNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // ── Quick Reply Templates state ──
  const [templates, setTemplates] = useState<QuickReplyTemplate[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateFilter, setTemplateFilter] = useState("");
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateText, setNewTemplateText] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // ── Carousel / Send Product Card state ──
  const [showCarouselModal, setShowCarouselModal] = useState(false);
  const [carouselProducts, setCarouselProducts] = useState<{ id: number; name: string; price: number; category: string; image: string }[]>([]);
  const [carouselSelected, setCarouselSelected] = useState<number[]>([]);
  const [carouselCategoryFilter, setCarouselCategoryFilter] = useState("");
  const [sendingCarousel, setSendingCarousel] = useState(false);
  const [carouselLoaded, setCarouselLoaded] = useState(false);

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sseConvRef = useRef<EventSource | null>(null);
  const sseMsgRef = useRef<EventSource | null>(null);

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

  // ── Fetch quick reply templates ──
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/chat/admin?businessId=${encodeURIComponent(businessId)}&view=templates`
      );
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {}
  }, [businessId]);

  // ── Fetch CRM notes for active conversation ──
  const fetchNotes = useCallback(async (uid: string) => {
    try {
      const res = await fetch(
        `/api/chat/admin?businessId=${encodeURIComponent(businessId)}&view=notes&userId=${encodeURIComponent(uid)}`
      );
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch {}
  }, [businessId]);

  // ── SSE: conversation list stream ──
  useEffect(() => {
    fetchConversations();
    fetchFollowups();
    fetchTemplates();

    const connectConvSSE = () => {
      if (sseConvRef.current) sseConvRef.current.close();
      const es = new EventSource(
        `/api/chat/stream?businessId=${encodeURIComponent(businessId)}`
      );
      es.addEventListener("convs", (e) => {
        try {
          const payload = JSON.parse((e as MessageEvent).data) as {
            conversations?: import("@/lib/chatStore").ChatConversation[];
            totalUnread?: number;
            globalBotEnabled?: boolean;
          };
          if (payload.conversations) setConversations(payload.conversations);
          if (typeof payload.totalUnread === "number") setTotalUnread(payload.totalUnread);
          if (typeof payload.globalBotEnabled === "boolean") setGlobalBotEnabled(payload.globalBotEnabled);
        } catch {}
      });
      es.onerror = () => {
        es.close();
        setTimeout(connectConvSSE, 3000);
      };
      sseConvRef.current = es;
    };

    connectConvSSE();

    const handleVisibility = () => {
      if (!document.hidden) {
        connectConvSSE();
        fetchConversations();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      sseConvRef.current?.close();
      sseConvRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // ── SSE: messages stream for active conversation ──
  useEffect(() => {
    if (!activeUserId) {
      sseMsgRef.current?.close();
      sseMsgRef.current = null;
      return;
    }

    fetchMessages();

    const connectMsgSSE = () => {
      if (sseMsgRef.current) sseMsgRef.current.close();
      const es = new EventSource(
        `/api/chat/stream?businessId=${encodeURIComponent(businessId)}&userId=${encodeURIComponent(activeUserId)}`
      );
      es.addEventListener("msgs", (e) => {
        try {
          const payload = JSON.parse((e as MessageEvent).data) as {
            messages?: import("@/lib/chatStore").ChatMessage[];
            followup?: import("@/lib/chatStore").FollowUpResult & { needsFollowup: boolean };
          };
          if (payload.messages) setMessages(payload.messages);
          if (payload.followup && payload.followup.needsFollowup) {
            setActiveFollowup(payload.followup);
            setEditFollowupMsg(payload.followup.suggestedMessage || "");
          } else if (payload.followup) {
            setActiveFollowup(null);
            setEditFollowupMsg("");
          }
        } catch {}
      });
      es.onerror = () => {
        es.close();
        setTimeout(connectMsgSSE, 3000);
      };
      sseMsgRef.current = es;
    };

    connectMsgSSE();

    return () => {
      sseMsgRef.current?.close();
      sseMsgRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId, businessId]);

  // ── Auto-scroll to bottom on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Debounced full-text search ──
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchText.length < 3) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/search?businessId=${encodeURIComponent(businessId)}&q=${encodeURIComponent(searchText)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch {}
      setSearching(false);
    }, 400);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchText, businessId]);

  // ── Mark as read when selecting conversation ──
  const selectConversation = async (userId: string) => {
    setActiveUserId(userId);
    setMessages([]);
    setNotes([]);
    setNoteText("");
    setActiveFollowup(null);
    setEditingFollowup(false);
    fetchNotes(userId);
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

  // ── Agent Assignment: claim / release ──
  const handleClaim = async (userId: string) => {
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", businessId, userId }),
      });
      await fetchConversations();
      await fetchMessages();
    } catch {}
  };

  const handleRelease = async (userId: string) => {
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unassign", businessId, userId }),
      });
      await fetchConversations();
      await fetchMessages();
    } catch {}
  };

  // ── Quick Reply Template: use template ──
  const applyTemplate = (template: QuickReplyTemplate) => {
    setInputText(template.text);
    setShowTemplatePicker(false);
    setTemplateFilter("");
    inputRef.current?.focus();
  };

  // ── Quick Reply Template: save new ──
  const handleSaveTemplate = async () => {
    if (!newTemplateTitle.trim() || !newTemplateText.trim()) return;
    setSavingTemplate(true);
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveTemplate",
          businessId,
          title: newTemplateTitle.trim(),
          text: newTemplateText.trim(),
        }),
      });
      setNewTemplateTitle("");
      setNewTemplateText("");
      await fetchTemplates();
    } catch {}
    setSavingTemplate(false);
  };

  // ── Quick Reply Template: delete ──
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteTemplate",
          businessId,
          templateId,
        }),
      });
      await fetchTemplates();
    } catch {}
  };

  // ── CRM Note: add / delete ──
  const handleAddNote = async () => {
    if (!noteText.trim() || !activeUserId || savingNote) return;
    setSavingNote(true);
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addNote",
          businessId,
          userId: activeUserId,
          text: noteText.trim(),
        }),
      });
      setNoteText("");
      await fetchNotes(activeUserId);
    } catch {}
    setSavingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!activeUserId) return;
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteNote",
          businessId,
          userId: activeUserId,
          noteId,
        }),
      });
      await fetchNotes(activeUserId);
    } catch {}
  };

  // ── Input change handler (detect "/" to open template picker) ──
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    if (val === "/") {
      setShowTemplatePicker(true);
      setTemplateFilter("");
    } else if (val.startsWith("/") && showTemplatePicker) {
      setTemplateFilter(val.slice(1).toLowerCase());
    } else {
      setShowTemplatePicker(false);
    }
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

  // ── Carousel: load product list from API ──
  const loadCarouselProducts = useCallback(async () => {
    if (carouselLoaded) return;
    try {
      const res = await fetch(`/api/products?businessId=${encodeURIComponent(businessId)}`);
      if (res.ok) {
        const data = await res.json();
        setCarouselProducts(data.products || []);
        setCarouselLoaded(true);
      }
    } catch {}
  }, [businessId, carouselLoaded]);

  const openCarouselModal = () => {
    setShowCarouselModal(true);
    setCarouselSelected([]);
    setCarouselCategoryFilter("");
    loadCarouselProducts();
  };

  const toggleCarouselProduct = (id: number) => {
    setCarouselSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSendCarousel = async () => {
    if (!activeUserId || carouselSelected.length === 0 || sendingCarousel) return;
    setSendingCarousel(true);
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendCarousel",
          businessId,
          userId: activeUserId,
          productIds: carouselSelected,
        }),
      });
      setShowCarouselModal(false);
      await fetchMessages();
    } catch {}
    setSendingCarousel(false);
  };

  // ── Filtered conversations ──
  const pinnedCount = conversations.filter((c) => c.pinned).length;

  // When search query >= 3 chars, use API search results (full-text); else client-side filter
  const isFullTextSearch = searchText.length >= 3;

  const filtered = (() => {
    if (isFullTextSearch) {
      // Map search results back to conversations (to get full conv data) with snippet info attached
      return searchResults.map((r) => {
        const conv = conversations.find((c) => c.userId === r.userId);
        return conv ? { ...conv, _snippet: r.snippet } : null;
      }).filter(Boolean) as (import("@/lib/chatStore").ChatConversation & { _snippet?: string })[];
    }

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
    return list as (import("@/lib/chatStore").ChatConversation & { _snippet?: string })[];
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
                placeholder="ค้นหา... (≥3 ตัวอักษร = ค้นในข้อความด้วย)"
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          )}
          {/* Search status */}
          {searchText.length >= 3 && (
            <p className="text-[10px] text-gray-400 px-1 pt-1.5">
              {searching
                ? "กำลังค้นหา..."
                : `พบ ${filtered.length} รายการ สำหรับ "${searchText}"`}
            </p>
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
                  : "Conversations will appear here when customers send messages via LINE or Facebook"}
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
                   {/* Platform badge */}
                   {conv.source && (
                     <div className="flex items-center gap-1.5 mt-0.5">
                       <PlatformBadge source={conv.source} />
                     </div>
                   )}
                  {conv.assignedAdmin && (
                    <p className="text-[10px] text-indigo-500 mt-0.5 flex items-center gap-1">
                      <Shield className="h-2.5 w-2.5" />
                      {conv.assignedAdmin}
                    </p>
                  )}
                  {/* Search snippet */}
                  {"_snippet" in conv && conv._snippet && (
                    <p className="text-[10px] text-yellow-700 bg-yellow-50 rounded px-1 py-0.5 mt-0.5 truncate border border-yellow-100">
                      ...{conv._snippet}...
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Center + Right: Chat Thread + CRM Panel ── */}
      <div className="flex-1 flex overflow-hidden">

      {/* ── Chat Thread ── */}
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
                    <PlatformBadge source={activeConv?.source ?? "line"} />
                    <Circle className="h-1 w-1 fill-current opacity-40" />
                    <span className="font-mono opacity-60 select-all" title={activeUserId}>
                      {activeUserId.length > 20
                        ? `${activeUserId.slice(0, 8)}…${activeUserId.slice(-6)}`
                        : activeUserId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {activeConv && (
                <div className="flex items-center gap-2">
                  {/* Claim / Release button */}
                  {activeConv.assignedAdmin ? (
                    <button
                      onClick={() => handleRelease(activeConv.userId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all"
                      title="คืนงาน"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      <span>{activeConv.assignedAdmin}</span>
                      <X className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClaim(activeConv.userId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
                      title="รับงาน"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      <span>Claim</span>
                    </button>
                  )}

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
                        : "bg-red-50 text-red-700 hover:bg-red-100"
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

                  {/* Send Product Carousel button */}
                  <button
                    onClick={openCarouselModal}
                    title="ส่งสินค้าแนะนำ (carousel)"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <Package className="h-3.5 w-3.5" />
                    <span>สินค้า</span>
                  </button>

                  {/* Notes toggle */}
                  <button
                    onClick={() => setShowNotes((v) => !v)}
                    title="บันทึกโน้ตลูกค้า"
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      showNotes
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-gray-50 text-gray-600 hover:bg-yellow-50 hover:text-yellow-700"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Notes{notes.length > 0 ? ` (${notes.length})` : ""}</span>
                  </button>
                </div>
              )}
            </div>

            {/* CRM Notes Panel */}
            {showNotes && (
              <div className="border-b border-yellow-200 bg-yellow-50">
                <div className="px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-yellow-800 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    โน้ตส่วนตัว (ไม่ส่งให้ลูกค้า)
                  </span>
                  <button onClick={() => setShowNotes(false)} className="text-yellow-500 hover:text-yellow-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {notes.length > 0 && (
                  <div className="px-4 pb-2 space-y-1.5 max-h-36 overflow-y-auto">
                    {notes.map((n) => (
                      <div key={n.id} className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border border-yellow-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-800 whitespace-pre-wrap">{n.text}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {n.createdBy} · {new Date(n.createdAt).toLocaleDateString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <button onClick={() => handleDeleteNote(n.id)} className="text-gray-300 hover:text-red-500 shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {notes.length === 0 && (
                  <p className="px-4 pb-2 text-[11px] text-yellow-600">ยังไม่มีโน้ต — เพิ่มได้ด้านล่าง</p>
                )}
                <div className="px-4 pb-3 flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(); }}
                    placeholder="เพิ่มโน้ต..."
                    className="flex-1 px-3 py-1.5 text-xs border border-yellow-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim() || savingNote}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg font-medium transition-all",
                      noteText.trim() && !savingNote
                        ? "bg-yellow-500 text-white hover:bg-yellow-600"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {savingNote ? "..." : "บันทึก"}
                  </button>
                </div>
              </div>
            )}

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
              {/* Quick Reply Template Picker */}
              {showTemplatePicker && templates.length > 0 && (
                <div className="mb-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 font-medium">ข้อความสำเร็จรูป</span>
                    <button
                      onClick={() => { setShowTemplatePicker(false); setInputText(""); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {templates
                    .filter((t) =>
                      !templateFilter ||
                      t.title.toLowerCase().includes(templateFilter) ||
                      t.text.toLowerCase().includes(templateFilter)
                    )
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={() => applyTemplate(t)}
                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <p className="text-xs font-semibold text-indigo-700">{t.title}</p>
                        <p className="text-[11px] text-gray-500 truncate">{t.text}</p>
                      </button>
                    ))}
                  {templates.filter((t) =>
                    !templateFilter ||
                    t.title.toLowerCase().includes(templateFilter) ||
                    t.text.toLowerCase().includes(templateFilter)
                  ).length === 0 && (
                    <p className="px-3 py-2 text-[11px] text-gray-400">ไม่พบข้อความที่ตรงกัน</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* Template shortcut button */}
                <button
                  onClick={() => setShowTemplateManager((v) => !v)}
                  title="จัดการข้อความสำเร็จรูป"
                  className={cn(
                    "p-2 rounded-lg border transition-all shrink-0",
                    showTemplateManager
                      ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                      : "border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-300"
                  )}
                >
                  <Zap className="h-4 w-4" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && showTemplatePicker) {
                      setShowTemplatePicker(false);
                      setInputText("");
                      return;
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    activeConv?.botEnabled
                      ? "พิมพ์ข้อความ... (บอทตอบอัตโนมัติอยู่)  หรือพิมพ์ / เพื่อเลือกข้อความสำเร็จรูป"
                      : "พิมพ์ข้อความถึงลูกค้า...  หรือพิมพ์ / เพื่อเลือกข้อความสำเร็จรูป"
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
                  Bot is auto-replying to this customer. Turn off to reply manually.
                </p>
              )}
              {activeConv && !activeConv.botEnabled && (
                <p className="text-[10px] text-orange-600 mt-1.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Bot is OFF. You are replying manually to this customer.
                </p>
              )}

              {/* Template Manager Panel */}
              {showTemplateManager && (
                <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-indigo-500" />
                      ข้อความสำเร็จรูป ({templates.length})
                    </span>
                    <button
                      onClick={() => setShowTemplateManager(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* Existing templates */}
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
                    {templates.length === 0 && (
                      <p className="px-3 py-3 text-[11px] text-gray-400 text-center">
                        ยังไม่มีข้อความสำเร็จรูป — เพิ่มด้านล่างได้เลย
                      </p>
                    )}
                    {templates.map((t) => (
                      <div key={t.id} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{t.title}</p>
                          <p className="text-[11px] text-gray-500 line-clamp-2">{t.text}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => applyTemplate(t)}
                            title="ใช้ข้อความนี้"
                            className="text-indigo-500 hover:text-indigo-700 p-0.5"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(t.id)}
                            title="ลบ"
                            className="text-red-400 hover:text-red-600 p-0.5"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Add new template */}
                  <div className="p-3 bg-gray-50 border-t border-gray-200 space-y-2">
                    <input
                      type="text"
                      value={newTemplateTitle}
                      onChange={(e) => setNewTemplateTitle(e.target.value)}
                      placeholder="ชื่อ (เช่น ทักทาย, ขอบคุณ)"
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <textarea
                      value={newTemplateText}
                      onChange={(e) => setNewTemplateText(e.target.value)}
                      placeholder="ข้อความ..."
                      rows={2}
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                    />
                    <button
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate || !newTemplateTitle.trim() || !newTemplateText.trim()}
                      className={cn(
                        "w-full py-1.5 text-xs rounded-lg font-medium transition-all",
                        !savingTemplate && newTemplateTitle.trim() && newTemplateText.trim()
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      {savingTemplate ? "กำลังบันทึก..." : "บันทึกข้อความสำเร็จรูป"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── CRM Panel (right) — shown only when a conversation is active ── */}
      {activeUserId && activeConv && (
        <CRMPanel
          businessId={businessId}
          userId={activeUserId}
          displayName={activeConv.displayName}
        />
      )}

      </div>{/* end center+right wrapper */}

      {/* ── Product Carousel Modal ── */}
      {showCarouselModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-gray-900">ส่งสินค้าแนะนำ</h3>
                {carouselSelected.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                    เลือก {carouselSelected.length} ชิ้น
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowCarouselModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Category filter */}
            <div className="px-5 py-3 border-b border-gray-100">
              <input
                type="text"
                value={carouselCategoryFilter}
                onChange={(e) => setCarouselCategoryFilter(e.target.value)}
                placeholder="ค้นหาสินค้า หรือกรอง category..."
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {carouselProducts.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                  กำลังโหลดสินค้า...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {carouselProducts
                    .filter((p) =>
                      !carouselCategoryFilter ||
                      p.name.toLowerCase().includes(carouselCategoryFilter.toLowerCase()) ||
                      p.category.toLowerCase().includes(carouselCategoryFilter.toLowerCase())
                    )
                    .map((p) => {
                      const isSelected = carouselSelected.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleCarouselProduct(p.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                            isSelected
                              ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400"
                              : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                          )}
                        >
                          {/* Product image */}
                          <div className="h-14 w-14 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.image}
                              alt={p.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-xs font-semibold truncate",
                              isSelected ? "text-emerald-800" : "text-gray-800"
                            )}>
                              {p.name}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{p.category}</p>
                            <p className={cn(
                              "text-xs font-bold mt-1",
                              isSelected ? "text-emerald-600" : "text-red-500"
                            )}>
                              {p.price.toLocaleString("th-TH")} ฿
                            </p>
                          </div>
                          {/* Check indicator */}
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                onClick={() => setCarouselSelected([])}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ล้างรายการ
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCarouselModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSendCarousel}
                  disabled={carouselSelected.length === 0 || sendingCarousel}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl transition-all",
                    carouselSelected.length > 0 && !sendingCarousel
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  <Send className="h-3.5 w-3.5" />
                  {sendingCarousel
                    ? "กำลังส่ง..."
                    : `ส่งสินค้า${carouselSelected.length > 0 ? ` (${carouselSelected.length})` : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
