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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatConversation, ChatMessage } from "@/lib/chatStore";

interface LiveChatPageProps {
  businessId: string;
}

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

export default function LiveChatPage({ businessId }: LiveChatPageProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sending, setSending] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
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
      }
    } catch {
      // Silently fail
    }
  }, [businessId, activeUserId]);

  // ── Polling ──
  useEffect(() => {
    fetchConversations();
    pollRef.current = setInterval(fetchConversations, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchConversations]);

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
    // Mark as read
    try {
      await fetch("/api/chat/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", businessId, userId }),
      });
      fetchConversations();
    } catch {
      // Ignore
    }
  };

  // ── Send admin message ──
  const handleSend = async () => {
    if (!inputText.trim() || !activeUserId || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);

    // Optimistic UI — add message immediately
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
      // Refresh messages to get actual stored message
      await fetchMessages();
      await fetchConversations();
    } catch {
      // Revert optimistic update on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  // ── Toggle bot ──
  const handleToggleBot = async (userId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled;
    // Optimistic update
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
      // Revert
      setConversations((prev) =>
        prev.map((c) =>
          c.userId === userId ? { ...c, botEnabled: currentEnabled } : c
        )
      );
    }
  };

  // ── Filtered conversations ──
  const filtered = searchText
    ? conversations.filter(
        (c) =>
          c.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
          c.userId.toLowerCase().includes(searchText.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(searchText.toLowerCase())
      )
    : conversations;

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
          {/* Search */}
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
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6">
              <MessageCircle className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">No conversations yet</p>
              <p className="text-xs text-center mt-1">
                Conversations will appear here when customers send messages via LINE
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
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {conv.displayName}
                    </p>
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
                    <span className="font-mono">{activeUserId.slice(0, 16)}...</span>
                  </div>
                </div>
              </div>

              {/* Bot Toggle */}
              {activeConv && (
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
              )}
            </div>

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
                    <div
                      key={msg.id}
                      className="flex justify-center"
                    >
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
                      {/* Role badge */}
                      {isBot && (
                        <div className="flex items-center gap-1 mb-1">
                          <Bot className="h-3 w-3 text-indigo-500" />
                          <span className="text-[10px] font-semibold text-indigo-500">
                            Bot
                          </span>
                          {msg.pipelineLayerName && (
                            <span className="text-[9px] text-gray-400 ml-1">
                              L{msg.pipelineLayer}: {msg.pipelineLayerName}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Message text */}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
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

                    {/* Avatar for admin */}
                    {isAdmin && (
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Shield className="h-3.5 w-3.5 text-white" />
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
                  Bot is auto-replying to this customer. Turn off to reply manually.
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
