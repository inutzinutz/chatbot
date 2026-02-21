"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import PipelineTracePanel from "./PipelineTrace";
import type { PipelineTrace } from "@/lib/inspector";
import {
  Send,
  Bot,
  User,
  Clock,
  CheckSquare,
  RotateCcw,
  Sparkles,
  Trash2,
  Zap,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";

interface TestMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  trace?: PipelineTrace;
  responseTimeMs?: number;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
      title="Copy"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

import { DEFAULT_BUSINESS_ID, businessUnitList } from "@/lib/businessUnits";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AITestingProps {
  businessId?: string;
}

export default function AITesting({ businessId = DEFAULT_BUSINESS_ID }: AITestingProps) {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset when business changes
  useEffect(() => {
    setMessages([]);
    setExpandedMessage(null);
    setInput("");
  }, [businessId]);

  const bizName = businessUnitList.find((b) => b.id === businessId)?.name || "AI";
  const isEvLife = businessId === "evlifethailand";

  const testScenarios = isEvLife
    ? [
        { label: "Battery price", msg: "แบตเตอรี่ BYD Atto 3 ราคาเท่าไหร่" },
        { label: "EM motorcycle", msg: "มอเตอร์ไซค์ไฟฟ้า EM มีรุ่นไหนบ้าง" },
        { label: "On-site service", msg: "มีบริการเปลี่ยนถึงบ้านไหม" },
        { label: "Warranty info", msg: "แบตเตอรี่ประกันกี่ปี" },
        { label: "Battery symptom", msg: "รถ EV เปิดไม่ติด แบตหมด" },
        { label: "Promotion check", msg: "มีโปรโมชั่นอะไรบ้าง" },
        { label: "Follow-up test", msg: "แล้วราคาเท่าไหร่" },
        { label: "Admin escalation", msg: "ขอคุยกับแอดมินหน่อย" },
        { label: "Registration", msg: "มอเตอร์ไซค์ EM จดทะเบียนได้ไหม" },
        { label: "Stock check", msg: "แบตเตอรี่ Tesla Model 3 มีของไหม" },
      ]
    : [
        { label: "Price inquiry", msg: "DJI Avata 2 ราคาเท่าไหร่" },
        { label: "Promotion check", msg: "มีโปรโมชั่นอะไรบ้าง" },
        { label: "Shipping query", msg: "ส่งต่างประเทศได้ไหม" },
        { label: "Warranty info", msg: "warranty for DJI Mini 4 Pro?" },
        { label: "Follow-up test", msg: "แล้วราคาเท่าไหร่" },
        { label: "Product specs", msg: "DJI Mini 4 Pro สเปคเป็นยังไง" },
        { label: "Compare products", msg: "Mini 4 Pro กับ Air 3S อะไรดีกว่า" },
        { label: "Admin escalation", msg: "ขอคุยกับแอดมินหน่อย" },
        { label: "Discontinued product", msg: "DJI Mini 3 Pro มีไหม" },
        { label: "Stock check", msg: "Avata 2 มีของไหม" },
      ];

  const sampleMsg = isEvLife ? "แบตเตอรี่ BYD Atto 3 ราคา" : "DJI Mini 4 Pro ราคาเท่าไหร่";

  const placeholderQuestions = isEvLife
    ? [
        "แบตเตอรี่ Tesla Model Y ราคา",
        "มอเตอร์ไซค์ EM Milano สเปค",
        "บริการ On-site ครอบคลุมที่ไหนบ้าง",
        "EM Legend Pro กับ Enzo ต่างกันยังไง",
        "แบตเตอรี่ 12V เสื่อม อาการเป็นยังไง",
      ]
    : [
        "DJI Mini 4 Pro ราคา",
        "มีโปรโมชั่นอะไรบ้าง",
        "warranty info",
        "ส่งต่างประเทศได้ไหม",
        "ลงทะเบียนโดรน",
      ];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const nowStr = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    const userMsg: TestMessage = {
      id: Date.now(),
      role: "user",
      content: trimmed,
      timestamp: nowStr(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const startTime = Date.now();

    try {
      // Build messages array from conversation history (exclude welcome)
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, businessId }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream")) {
        // Handle SSE streaming (Claude or OpenAI mode)
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let streamTrace: PipelineTrace | undefined;
        let assistantId: number | null = null;
        let sseBuffer = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() || "";

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine) continue;
              if (trimmedLine.startsWith("data: ")) {
                const data = trimmedLine.slice(6);
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);

                  if (parsed.trace) {
                    streamTrace = parsed.trace as PipelineTrace;
                    continue;
                  }

                  if (parsed.content) {
                    assistantContent += parsed.content;
                    const responseTimeMs = Date.now() - startTime;

                    if (assistantId === null) {
                      assistantId = Date.now() + 1;
                      const botMsg: TestMessage = {
                        id: assistantId,
                        role: "assistant",
                        content: assistantContent,
                        timestamp: nowStr(),
                        trace: streamTrace,
                        responseTimeMs,
                      };
                      setMessages((prev) => [...prev, botMsg]);
                      setExpandedMessage(assistantId);
                      setIsProcessing(false);
                    } else {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantId
                            ? { ...m, content: assistantContent, trace: streamTrace, responseTimeMs }
                            : m
                        )
                      );
                    }
                  }
                } catch {
                  // skip malformed
                }
              }
            }
          }

          // If no content was streamed, show error
          if (assistantId === null) {
            const botMsg: TestMessage = {
              id: Date.now() + 1,
              role: "assistant",
              content: "ไม่ได้รับการตอบกลับจาก API",
              timestamp: nowStr(),
              responseTimeMs: Date.now() - startTime,
            };
            setMessages((prev) => [...prev, botMsg]);
            setIsProcessing(false);
          }
        }
      } else {
        // Handle JSON response (fallback mode)
        const data = await response.json();
        const responseTimeMs = Date.now() - startTime;

        const botMsg: TestMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: data.content,
          timestamp: nowStr(),
          trace: data.trace as PipelineTrace | undefined,
          responseTimeMs,
        };

        setMessages((prev) => [...prev, botMsg]);
        setExpandedMessage(botMsg.id);
        setIsProcessing(false);
      }
    } catch {
      const botMsg: TestMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: "ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้งครับ",
        timestamp: nowStr(),
        responseTimeMs: Date.now() - startTime,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setExpandedMessage(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 min-h-14 h-14 px-5 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm">
            <CheckSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">AI Testing</h2>
            <p className="text-[10px] text-gray-400">Live API — real pipeline responses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          )}
          <button
            onClick={() => setInput(sampleMsg)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            Sample
          </button>
        </div>
      </header>

      {/* Content area */}
      <div className="flex-1 flex min-h-0">
        {/* Chat column */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-100">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center space-y-3 py-20">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">
                    AI Testing Playground
                  </h3>
                  <p className="text-xs text-gray-500 max-w-xs">
                    Send a test message to see how the real AI pipeline processes it.
                    View the full Pipeline Trace with all 15 layers.
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                    {placeholderQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="px-2.5 py-1 text-[11px] rounded-full border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  className={cn(
                    "flex gap-3",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm",
                      msg.role === "user"
                        ? "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white"
                        : "bg-gradient-to-br from-gray-800 to-black text-white"
                    )}
                  >
                    {msg.role === "user" ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={cn(
                      "max-w-[75%] flex flex-col",
                      msg.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-md shadow-sm"
                          : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex-1 whitespace-pre-wrap">{msg.content}</span>
                        {msg.role === "assistant" && <CopyButton text={msg.content} />}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[10px] text-gray-300">
                        {msg.timestamp}
                      </span>
                      {msg.responseTimeMs !== undefined && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {msg.responseTimeMs.toLocaleString()} ms
                        </span>
                      )}
                      {msg.trace && (
                        <button
                          onClick={() =>
                            setExpandedMessage(
                              expandedMessage === msg.id ? null : msg.id
                            )
                          }
                          className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-0.5 transition-colors"
                        >
                          <Zap className="h-2.5 w-2.5" />
                          Pipeline
                          {expandedMessage === msg.id ? (
                            <ChevronDown className="h-2.5 w-2.5" />
                          ) : (
                            <ChevronRight className="h-2.5 w-2.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Pipeline Trace (real data!) */}
                    {msg.trace && expandedMessage === msg.id && (
                      <div className="mt-1 w-full max-w-lg">
                        <PipelineTracePanel trace={msg.trace} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-800 to-black text-white shadow-sm">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-[bounce_1.4s_ease-in-out_infinite]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
                    </div>
                    <span className="text-xs text-gray-400 animate-pulse">
                      Processing through pipeline...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 bg-white/80 backdrop-blur-sm p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50/80 px-3 py-2 focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-all duration-200">
              <Sparkles className="h-4 w-4 text-gray-300 shrink-0 mb-1" />
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a test message... (Enter to send)"
                disabled={isProcessing}
                rows={1}
                className={cn(
                  "flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-gray-400",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
              />
              <button
                onClick={handleSend}
                disabled={isProcessing || !input.trim()}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                  input.trim() && !isProcessing
                    ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-200/50 scale-100"
                    : "bg-transparent text-gray-300 cursor-not-allowed scale-90"
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 px-1">
              Live mode — calls real /api/chat endpoint with full pipeline processing.
            </p>
          </div>
        </div>

        {/* Right panel: Test scenarios */}
        <div className="w-72 flex-shrink-0 overflow-y-auto p-4 space-y-4 hidden lg:block">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              AI Pipeline
            </h3>
            <div className="space-y-2">
              {[
                { name: "Pipeline First", desc: "15-layer intent/FAQ/knowledge pipeline runs first", color: "text-blue-600 bg-blue-50 border-blue-200" },
                { name: "Claude Sonnet", desc: "GPT fallback — only if pipeline can't resolve", color: "text-violet-600 bg-violet-50 border-violet-200" },
                { name: "GPT-4o-mini", desc: "GPT fallback — if no Anthropic key", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
              ].map((mode) => (
                <div key={mode.name} className={cn("rounded-lg p-3 border", mode.color)}>
                  <span className="text-xs font-semibold">{mode.name}</span>
                  <p className="text-[10px] opacity-70 mt-0.5">{mode.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Test Scenarios
            </h3>
            <div className="space-y-1.5">
              {testScenarios.map((scenario) => (
                <button
                  key={scenario.label}
                  onClick={() => setInput(scenario.msg)}
                  disabled={isProcessing}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border border-transparent hover:border-indigo-200 disabled:opacity-50"
                >
                  <span className="font-medium">{scenario.label}</span>
                  <span className="block text-[10px] text-gray-400 mt-0.5 truncate">
                    {scenario.msg}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Tips
            </h3>
            <ul className="text-[11px] text-gray-500 space-y-1.5">
              <li>Click <span className="text-indigo-500 font-medium">Pipeline</span> on a response to see the full trace</li>
              <li>Send follow-up messages to test conversation context</li>
              <li>Try short messages like &ldquo;ราคา&rdquo; after mentioning a product</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
