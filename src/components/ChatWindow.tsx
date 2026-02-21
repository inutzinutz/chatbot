"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import QuickReplies from "./QuickReplies";
import { Bot, RotateCcw } from "lucide-react";
import type { PipelineTrace } from "@/lib/inspector";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  trace?: PipelineTrace;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "สวัสดีครับ! 👋 ผมคือผู้ช่วย AI ของ **DJI 13 STORE** ตัวแทนจำหน่าย DJI อย่างเป็นทางการ\n\nผมช่วยอะไรได้บ้างครับ?\n- 🚁 แนะนำโดรน DJI\n- 📷 กล้องแอคชั่น Osmo\n- 🎥 กิมบอลกันสั่น\n- 💰 ราคาและโปรโมชั่น\n- 🚚 การจัดส่ง/รับประกัน\n\nลองเลือกหัวข้อด้านล่าง หรือพิมพ์ชื่อสินค้าได้เลยครับ!",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const sendMessage = async (content: string) => {
    const startedAt = Date.now();
    const minThinkingMs = 850;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setShowQuickReplies(false);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage]
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let assistantId: string | null = null;
        let streamTrace: PipelineTrace | undefined;

        const maybeFlushFirstToken = async () => {
          if (assistantId) return;

          const elapsed = Date.now() - startedAt;
          if (elapsed < minThinkingMs) {
            await sleep(minThinkingMs - elapsed);
          }

          assistantId = `assistant-${Date.now()}`;
          setMessages((prev) => [
            ...prev,
            {
              id: assistantId!,
              role: "assistant",
              content: assistantContent,
              trace: streamTrace,
            },
          ]);
          setIsLoading(false);
        };

        if (reader) {
          let sseBuffer = ""; // buffer for incomplete SSE lines across chunks

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // { stream: true } keeps incomplete UTF-8 multibyte chars buffered
            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            // Keep the last (possibly incomplete) line in the buffer
            sseBuffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (trimmed.startsWith("data: ")) {
                const data = trimmed.slice(6);
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);

                  // Check if this is a trace event
                  if (parsed.trace) {
                    streamTrace = parsed.trace as PipelineTrace;
                    continue;
                  }

                  if (parsed.content) {
                    assistantContent += parsed.content;
                    if (!assistantId) {
                      await maybeFlushFirstToken();
                    } else {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantId
                            ? { ...m, content: assistantContent, trace: streamTrace }
                            : m
                        )
                      );
                    }
                  }
                } catch {
                  // skip malformed JSON — line may be incomplete, will retry next chunk
                }
              }
            }
          }

          if (!assistantId) {
            await maybeFlushFirstToken();
          }
        }
      } else {
        // Handle JSON response (fallback mode)
        const data = await response.json();

        const elapsed = Date.now() - startedAt;
        if (elapsed < minThinkingMs) {
          await sleep(minThinkingMs - elapsed);
        }

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.content,
          trace: data.trace as PipelineTrace | undefined,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
      }
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้งครับ 🙏",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setShowQuickReplies(true);
    setIsLoading(false);
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gray-800 to-gray-900 text-white shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              DJI 13 STORE Assistant
            </h2>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-500">ออนไลน์</span>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            trace={msg.trace}
          />
        ))}
        {isLoading && (
          <ChatMessage role="assistant" content="" isLoading={true} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {showQuickReplies && (
        <QuickReplies onSelect={sendMessage} disabled={isLoading} />
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
