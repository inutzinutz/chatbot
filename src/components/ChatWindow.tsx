"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput, { type AttachedFile } from "./ChatInput";
import QuickReplies from "./QuickReplies";
import { Bot, RotateCcw, FileText, ShieldCheck, User, Phone, ArrowRight } from "lucide-react";
import type { PipelineTrace } from "@/lib/inspector";
import { trackChatEvent } from "@/lib/chatEvents";
import { businessUnitList, DEFAULT_BUSINESS_ID } from "@/lib/businessUnits";

// PDPA consent key is scoped per BU so clearing one BU's consent doesn't affect others
function getPdpaStorageKey(businessId: string) {
  return `pdpa_consent_v1_${businessId}`;
}

function getSessionKey(businessId: string) {
  return `web_session_${businessId}`;
}

function getProfileKey(businessId: string) {
  return `web_profile_${businessId}`;
}

interface WebProfile {
  sessionId: string;
  displayName: string;
  phone: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  trace?: PipelineTrace;
  clarifyOptions?: string[];
  isStreaming?: boolean;
  attachment?: {
    name: string;
    mimeType: string;
    previewUrl?: string;
  };
}

const WELCOME_MESSAGES: Record<string, Message> = {
  dji13store: {
    id: "welcome",
    role: "assistant",
    content:
      "สวัสดีครับ! ผมคือผู้ช่วย AI ของ **DJI 13 STORE** ตัวแทนจำหน่าย DJI อย่างเป็นทางการ\n\nผมช่วยอะไรได้บ้างครับ?\n- โดรน DJI ทุกรุ่น\n- กล้องแอคชั่น Osmo\n- กิมบอลกันสั่น\n- ราคาและโปรโมชั่น\n- การจัดส่ง/รับประกัน\n\nลองเลือกหัวข้อด้านล่าง หรือพิมพ์ชื่อสินค้าได้เลยครับ!",
  },
  evlifethailand: {
    id: "welcome",
    role: "assistant",
    content:
      "สวัสดีครับ! ยินดีต้อนรับสู่ **EV Life Thailand** ผู้เชี่ยวชาญแบตเตอรี่ LiFePO4 สำหรับรถ EV และตัวแทนจำหน่ายมอเตอร์ไซค์ไฟฟ้า EM\n\nผมช่วยอะไรได้บ้างครับ?\n- แบตเตอรี่ 12V LiFePO4 สำหรับรถ EV\n- มอเตอร์ไซค์ไฟฟ้า EM\n- บริการ On-site ถึงบ้าน\n- สอบถามราคา/โปรโมชั่น\n- รับประกัน 4 ปี\n\nลองพิมพ์รุ่นรถ เช่น 'BYD Atto 3' หรือ 'EM Milano' ได้เลย\nหรือ **แนบรูปภาพ/PDF** เพื่อให้ AI วิเคราะห์ได้เลยครับ!",
  },
  dji13service: {
    id: "welcome",
    role: "assistant",
    content:
      "สวัสดีครับ! ยินดีต้อนรับสู่ **DJI 13 Service Plus** ศูนย์ซ่อมและบริการโดรน DJI ครบวงจร\n\nผมช่วยอะไรได้บ้างครับ?\n- ส่งซ่อมโดรน DJI ทุกรุ่น (ประเมินฟรี)\n- เคลม DJI Care Refresh\n- กรณีฉุกเฉิน — โดรนตกน้ำ / Flyaway\n- วินิจฉัย Error Code\n- อะไหล่แท้ DJI\n- ส่งซ่อมทางไปรษณีย์ได้ (ต่างจังหวัด)\n\nลองพิมพ์ปัญหา เช่น **'กิมบอลสั่น'** หรือ **'error motor'**\nหรือ **แนบรูปความเสียหาย** เพื่อให้ AI วิเคราะห์ได้เลยครับ!",
  },
};

function getWelcomeMessage(businessId: string): Message {
  return WELCOME_MESSAGES[businessId] || WELCOME_MESSAGES[DEFAULT_BUSINESS_ID];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface ChatWindowProps {
  businessId?: string;
}

export default function ChatWindow({ businessId = DEFAULT_BUSINESS_ID }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage(businessId)]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── PDPA consent ──
  const [pdpaConsented, setPdpaConsented] = useState<boolean>(false);
  useEffect(() => {
    try {
      setPdpaConsented(localStorage.getItem(getPdpaStorageKey(businessId)) === "1");
    } catch { setPdpaConsented(false); }
  }, [businessId]);

  // ── Web profile (name + phone + sessionId) ──
  const [webProfile, setWebProfile] = useState<WebProfile | null>(null);
  const [showPreChat, setShowPreChat] = useState(false);
  const [preName, setPreName] = useState("");
  const [prePhone, setPrePhone] = useState("");
  const [preSubmitting, setPreSubmitting] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getProfileKey(businessId));
      if (stored) {
        setWebProfile(JSON.parse(stored) as WebProfile);
        setShowPreChat(false);
      } else if (localStorage.getItem(getPdpaStorageKey(businessId)) === "1") {
        // PDPA accepted but no profile yet → show pre-chat form
        setShowPreChat(true);
      }
    } catch { /* ignore */ }
  }, [businessId]);

  // Show pre-chat form after PDPA is accepted (if no profile yet)
  useEffect(() => {
    if (pdpaConsented && !webProfile) {
      try {
        const stored = localStorage.getItem(getProfileKey(businessId));
        if (!stored) setShowPreChat(true);
      } catch { setShowPreChat(true); }
    }
  }, [pdpaConsented, webProfile, businessId]);

  const acceptPdpa = () => {
    try { localStorage.setItem(getPdpaStorageKey(businessId), "1"); } catch { /* ignore */ }
    setPdpaConsented(true);
    trackChatEvent({ type: "session_start" });
  };

  const submitPreChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preName.trim()) return;
    setPreSubmitting(true);

    const sessionId = generateUUID();
    const profile: WebProfile = {
      sessionId,
      displayName: preName.trim(),
      phone: prePhone.trim(),
    };
    try { localStorage.setItem(getProfileKey(businessId), JSON.stringify(profile)); } catch { /* ignore */ }
    setWebProfile(profile);
    setShowPreChat(false);
    setPreSubmitting(false);
  };

  // Reset when businessId changes
  useEffect(() => {
    setMessages([getWelcomeMessage(businessId)]);
    setShowQuickReplies(true);
    setIsLoading(false);
  }, [businessId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isLoading, scrollToBottom]);

  // ── Save exchange to chatStore (fire-and-forget) ──
  const saveWebExchange = useCallback((userMsg: string, botMsg: string, userTs: number, botTs: number) => {
    if (!webProfile) return;
    fetch("/api/chat/web-save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        sessionId: webProfile.sessionId,
        displayName: webProfile.displayName,
        phone: webProfile.phone || undefined,
        userMessage: userMsg,
        botMessage: botMsg,
        userTs,
        botTs,
      }),
    }).catch(() => {});
  }, [businessId, webProfile]);

  // ── File (vision) path ──
  const sendFile = async (file: AttachedFile, userPrompt: string) => {
    const startedAt = Date.now();
    const minThinkingMs = 850;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userPrompt || `[ส่งไฟล์: ${file.name}]`,
      attachment: { name: file.name, mimeType: file.mimeType, previewUrl: file.previewUrl },
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setShowQuickReplies(false);

    trackChatEvent({ type: "message_sent", messageLength: userPrompt.length, messagePreview: `[file: ${file.name}] ${userPrompt.slice(0, 80)}` });

    try {
      const resp = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData: file.dataBase64, mimeType: file.mimeType, fileName: file.name, userPrompt: userPrompt || undefined, businessId }),
      });

      const elapsed = Date.now() - startedAt;
      if (elapsed < minThinkingMs) await sleep(minThinkingMs - elapsed);

      const data = await resp.json() as { content?: string; error?: string };
      const botContent = data.content || data.error || "ไม่สามารถวิเคราะห์ไฟล์ได้ครับ";

      setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: "assistant", content: botContent }]);
      saveWebExchange(userMessage.content, botContent, startedAt, Date.now());
    } catch {
      setMessages((prev) => [...prev, { id: `error-${Date.now()}`, role: "assistant", content: "ขออภัยครับ เกิดข้อผิดพลาดในการวิเคราะห์ไฟล์ กรุณาลองใหม่ครับ" }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Text chat path ──
  const sendText = async (content: string) => {
    const startedAt = Date.now();
    const minThinkingMs = 850;

    const userMessage: Message = { id: `user-${Date.now()}`, role: "user", content };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setShowQuickReplies(false);

    trackChatEvent({ type: "message_sent", messageLength: content.length, messagePreview: content.slice(0, 100) });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(pdpaConsented ? { "x-pdpa-consent": "1" } : {}),
          ...(webProfile ? { "x-conversation-id": `web_${webProfile.sessionId}` } : {}),
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, content: m.content })),
          businessId,
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let assistantId: string | null = null;
        let streamTrace: PipelineTrace | undefined;

        const maybeFlushFirstToken = async () => {
          if (assistantId) return;
          const elapsed = Date.now() - startedAt;
          if (elapsed < minThinkingMs) await sleep(minThinkingMs - elapsed);
          assistantId = `assistant-${Date.now()}`;
          setMessages((prev) => [...prev, { id: assistantId!, role: "assistant", content: assistantContent, trace: streamTrace }]);
          setIsLoading(false);
        };

        if (reader) {
          let sseBuffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (trimmed.startsWith("data: ")) {
                const data = trimmed.slice(6);
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.trace) { streamTrace = parsed.trace as PipelineTrace; continue; }
                  if (parsed.content) {
                    assistantContent += parsed.content;
                    if (!assistantId) {
                      await maybeFlushFirstToken();
                    } else {
                      setMessages((prev) =>
                        prev.map((m) => m.id === assistantId ? { ...m, content: assistantContent, trace: streamTrace } : m)
                      );
                    }
                  }
                } catch { /* skip malformed */ }
              }
            }
          }
          if (!assistantId) await maybeFlushFirstToken();

          if (assistantContent) saveWebExchange(content, assistantContent, startedAt, Date.now());

          if (streamTrace) {
            trackChatEvent({ type: "response_received", mode: streamTrace.mode, finalLayer: streamTrace.finalLayer, finalLayerName: streamTrace.finalLayerName, intent: streamTrace.finalIntent, responseTimeMs: Date.now() - startedAt });
          }
        }
      } else {
        const data = await response.json();
        const elapsed = Date.now() - startedAt;
        if (elapsed < minThinkingMs) await sleep(minThinkingMs - elapsed);

        const trace = data.trace as PipelineTrace | undefined;
        const botContent: string = data.content;
        setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: "assistant", content: botContent, trace, clarifyOptions: data.clarifyOptions as string[] | undefined }]);
        setIsLoading(false);

        if (botContent) saveWebExchange(content, botContent, startedAt, Date.now());

        trackChatEvent({ type: "response_received", mode: trace?.mode, finalLayer: trace?.finalLayer, finalLayerName: trace?.finalLayerName, intent: trace?.finalIntent, responseTimeMs: Date.now() - startedAt });
      }
    } catch {
      setMessages((prev) => [...prev, { id: `error-${Date.now()}`, role: "assistant", content: "ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้งครับ" }]);
      setIsLoading(false);
    }
  };

  const handleSend = (content: string, file?: AttachedFile) => {
    if (file) sendFile(file, content);
    else if (content.trim()) sendText(content);
  };

  const resetChat = () => {
    setMessages([getWelcomeMessage(businessId)]);
    setShowQuickReplies(true);
    setIsLoading(false);
    trackChatEvent({ type: "session_start" });
  };

  const bizName = businessUnitList.find((b) => b.id === businessId)?.name || "Assistant";

  return (
    <div className="relative flex h-full flex-col bg-gray-50">

      {/* ── PDPA Consent Banner ── */}
      {!pdpaConsented && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full rounded-t-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 text-green-700">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-semibold text-sm">นโยบายความเป็นส่วนตัว (PDPA)</span>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-gray-600">
              เราเก็บรวบรวมข้อมูลการสนทนาเพื่อปรับปรุงบริการและตอบคำถามของคุณ
              ข้อมูลจะถูกเก็บรักษาอย่างปลอดภัยและไม่เปิดเผยแก่บุคคลภายนอก
              การกดปุ่ม &ldquo;ยอมรับ&rdquo; ถือว่าคุณยินยอมให้เราจัดเก็บข้อมูลการสนทนา
              ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA) พ.ศ. 2562
            </p>
            <button
              onClick={acceptPdpa}
              className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 active:bg-green-800 transition-colors"
            >
              ยอมรับและเริ่มใช้งาน
            </button>
          </div>
        </div>
      )}

      {/* ── Pre-chat form (name + phone) ── */}
      {pdpaConsented && showPreChat && (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-full rounded-t-2xl bg-white p-5 shadow-2xl">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{bizName}</p>
                <p className="text-[11px] text-gray-400">กรุณาแนะนำตัวก่อนเริ่มแชท</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-4 mt-2">
              เพื่อให้ทีมงานติดต่อกลับได้สะดวก กรุณากรอกชื่อและเบอร์โทรศัพท์
            </p>
            <form onSubmit={submitPreChat} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ชื่อ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={preName}
                    onChange={(e) => setPreName(e.target.value)}
                    placeholder="ชื่อของคุณ"
                    required
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  เบอร์โทรศัพท์ <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="tel"
                    value={prePhone}
                    onChange={(e) => setPrePhone(e.target.value)}
                    placeholder="0XX-XXX-XXXX"
                    className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!preName.trim() || preSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                เริ่มแชทเลย
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-800 to-gray-900 text-white shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {bizName + " Assistant"}
            </h2>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-500">
                {webProfile ? webProfile.displayName : "ออนไลน์"}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={resetChat}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="เริ่มแชทใหม่"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {messages.map((msg, idx) => (
          <div key={msg.id}>
            {msg.attachment && (
              <div className="flex justify-end px-4 pb-1">
                {msg.attachment.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={msg.attachment.previewUrl} alt={msg.attachment.name} className="max-h-48 max-w-[70%] rounded-xl object-cover shadow-sm" />
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2 text-sm text-indigo-700 max-w-[70%]">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{msg.attachment.name}</span>
                  </div>
                )}
              </div>
            )}

            <ChatMessage role={msg.role} content={msg.content} trace={msg.trace} />

            {msg.role === "assistant" && msg.clarifyOptions && msg.clarifyOptions.length > 0 && idx === messages.length - 1 && !isLoading && (
              <div className="flex flex-wrap gap-2 px-4 pb-2">
                {msg.clarifyOptions.map((opt) => (
                  <button key={opt} onClick={() => sendText(opt)} disabled={isLoading}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100 transition-colors">
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && <ChatMessage role="assistant" content="" isLoading={true} />}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick Replies ── */}
      {showQuickReplies && (
        <QuickReplies onSelect={(text) => sendText(text)} disabled={isLoading} businessId={businessId} />
      )}

      {/* ── Input ── */}
      <ChatInput onSend={handleSend} disabled={isLoading || !pdpaConsented || (pdpaConsented && showPreChat)} maxLength={500} />
    </div>
  );
}
