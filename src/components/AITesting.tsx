"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Send,
  Bot,
  User,
  Shield,
  MessageSquare,
  Brain,
  Clock,
  CheckSquare,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Trash2,
  Zap,
} from "lucide-react";

interface AgentStep {
  agent: "Supervise Agent" | "Intent Agent" | "Response Agent";
  duration: number;
  output: string;
  intent?: string;
  confidence?: number;
}

interface TestMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  agentSteps?: AgentStep[];
}

const AGENT_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  "Supervise Agent": {
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <Shield className="h-3.5 w-3.5" />,
  },
  "Intent Agent": {
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: <Brain className="h-3.5 w-3.5" />,
  },
  "Response Agent": {
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <MessageSquare className="h-3.5 w-3.5" />,
  },
};

function simulateAgentSteps(message: string): AgentStep[] {
  const intents: Record<string, { intent: string; confidence: number }> = {
    ราคา: { intent: "ask_price", confidence: 0.96 },
    price: { intent: "ask_price", confidence: 0.95 },
    โปรโมชั่น: { intent: "ask_promotion", confidence: 0.94 },
    promotion: { intent: "ask_promotion", confidence: 0.93 },
    ส่ง: { intent: "ask_shipping", confidence: 0.91 },
    ship: { intent: "ask_shipping", confidence: 0.92 },
    warranty: { intent: "ask_warranty", confidence: 0.93 },
    ประกัน: { intent: "ask_warranty", confidence: 0.94 },
    register: { intent: "ask_registration", confidence: 0.9 },
    ลงทะเบียน: { intent: "ask_registration", confidence: 0.91 },
    สี: { intent: "ask_product_detail", confidence: 0.89 },
    color: { intent: "ask_product_detail", confidence: 0.88 },
    spec: { intent: "ask_product_detail", confidence: 0.9 },
    สเปค: { intent: "ask_product_detail", confidence: 0.89 },
  };

  const lowerMsg = message.toLowerCase();
  let detectedIntent = { intent: "general_inquiry", confidence: 0.75 };
  for (const [keyword, intentData] of Object.entries(intents)) {
    if (lowerMsg.includes(keyword)) {
      detectedIntent = intentData;
      break;
    }
  }

  const responses: Record<string, string> = {
    ask_price:
      "สินค้า DJI มีหลายรุ่นครับ เช่น DJI Mini 4 Pro ราคา 22,900-28,900 บาท, DJI Avata 2 ราคา 28,900-38,900 บาท, DJI Air 3 ราคา 32,900-42,900 บาท ต้องการทราบรุ่นไหนเพิ่มเติมครับ?",
    ask_promotion:
      "ตอนนี้มีโปรโมชั่นพิเศษครับ! DJI Mini 4 Pro ลด 10% และ DJI Avata 2 แถม DJI Care Refresh 1 ปี สนใจรุ่นไหนครับ?",
    ask_shipping:
      "เราจัดส่งทั่วประเทศไทยครับ ค่าส่งเริ่มต้น 50 บาท สั่งซื้อครบ 5,000 บาทขึ้นไปส่งฟรี! สำหรับต่างประเทศกรุณาติดต่อ LINE @dji13store ครับ",
    ask_warranty:
      "สินค้า DJI ทุกรุ่นมีประกันศูนย์ DJI 1 ปีครับ สามารถซื้อ DJI Care Refresh เพิ่มเติมเพื่อคุ้มครองอุบัติเหตุได้ครับ",
    ask_registration:
      "เราให้บริการลงทะเบียนโดรน กสทช. ฟรีสำหรับลูกค้าที่ซื้อกับเราครับ! เตรียมบัตรประชาชนและข้อมูลโดรนมาที่ร้านได้เลยครับ",
    ask_product_detail:
      "DJI Mini 4 Pro มีสีเทาเข้ม (Dark Gray) น้ำหนักเพียง 249g บินได้ไกล 20km ถ่ายวิดีโอ 4K/60fps มีระบบหลบสิ่งกีดขวางรอบทิศทางครับ",
    general_inquiry:
      "สวัสดีครับ! ยินดีให้บริการครับ ผมเป็น AI ของ DJI 13 STORE สามารถสอบถามเกี่ยวกับสินค้า DJI ราคา โปรโมชั่น การจัดส่ง หรือบริการหลังการขายได้เลยครับ",
  };

  return [
    {
      agent: "Supervise Agent",
      duration: 800 + Math.floor(Math.random() * 400),
      output: `Received message. Routing to Intent Agent for classification. Message length: ${message.length} chars.`,
    },
    {
      agent: "Intent Agent",
      duration: 1200 + Math.floor(Math.random() * 600),
      output: `Classified intent: "${detectedIntent.intent}" with confidence ${(detectedIntent.confidence * 100).toFixed(1)}%`,
      intent: detectedIntent.intent,
      confidence: detectedIntent.confidence,
    },
    {
      agent: "Response Agent",
      duration: 1500 + Math.floor(Math.random() * 1000),
      output: responses[detectedIntent.intent] || responses.general_inquiry,
      intent: detectedIntent.intent,
    },
  ];
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

function AgentStepCard({
  step,
  index,
  isLast,
}: {
  step: AgentStep;
  index: number;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(index === 2);
  const config = AGENT_CONFIG[step.agent];

  return (
    <div className="relative">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-gray-200" />
      )}

      <div className="flex gap-3">
        {/* Timeline dot */}
        <div
          className={cn(
            "h-[30px] w-[30px] shrink-0 rounded-full flex items-center justify-center border-2 bg-white z-10",
            config.border
          )}
        >
          <span className={config.color}>{config.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 w-full text-left group"
          >
            <span
              className={cn(
                "text-xs font-semibold",
                config.color
              )}
            >
              {step.agent}
            </span>
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {step.duration.toLocaleString()} ms
            </span>
            {step.intent && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                {step.intent}
              </span>
            )}
            {step.confidence && (
              <span className="text-[10px] text-gray-400">
                {(step.confidence * 100).toFixed(0)}%
              </span>
            )}
            <span className="ml-auto text-gray-400 group-hover:text-gray-600 transition-colors">
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </span>
          </button>

          {expanded && (
            <div
              className={cn(
                "mt-2 rounded-lg p-3 text-xs leading-relaxed border",
                config.bg,
                config.border
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={cn("flex-1", config.color)}>{step.output}</p>
                <CopyButton text={step.output} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AITesting() {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const now = () => {
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
      timestamp: now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Simulate agent processing with delays
    const steps = simulateAgentSteps(trimmed);
    let totalDelay = 0;

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const responseContent =
          steps.find((s) => s.agent === "Response Agent")?.output ||
          "ขอโทษครับ ไม่สามารถประมวลผลได้ในขณะนี้";

        const botMsg: TestMessage = {
          id: Date.now() + 1,
          role: "assistant",
          content: responseContent,
          timestamp: now(),
          agentSteps: steps,
        };

        setMessages((prev) => [...prev, botMsg]);
        setExpandedMessage(botMsg.id);
        setIsProcessing(false);
        resolve();
      }, 1500 + Math.floor(Math.random() * 1000));
    });
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

  const totalDuration = (steps: AgentStep[]) =>
    steps.reduce((sum, s) => sum + s.duration, 0);

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
            onClick={() => {
              setInput("DJI Mini 4 Pro ราคาเท่าไหร่");
            }}
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
                    Send a test message to see how each AI agent processes it.
                    View the full pipeline: Supervise → Intent → Response.
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                    {[
                      "DJI Mini 4 Pro ราคา",
                      "มีโปรโมชั่นอะไรบ้าง",
                      "warranty info",
                      "ส่งต่างประเทศได้ไหม",
                      "ลงทะเบียนโดรน",
                    ].map((q) => (
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
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[10px] text-gray-300">
                        {msg.timestamp}
                      </span>
                      {msg.agentSteps && (
                        <button
                          onClick={() =>
                            setExpandedMessage(
                              expandedMessage === msg.id ? null : msg.id
                            )
                          }
                          className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-0.5 transition-colors"
                        >
                          <Zap className="h-2.5 w-2.5" />
                          {totalDuration(msg.agentSteps).toLocaleString()} ms
                          {expandedMessage === msg.id ? (
                            <ChevronDown className="h-2.5 w-2.5" />
                          ) : (
                            <ChevronRight className="h-2.5 w-2.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Agent Steps (inline) */}
                {msg.agentSteps && expandedMessage === msg.id && (
                  <div className="ml-11 mt-3 mb-2 p-4 rounded-xl bg-gray-50/80 border border-gray-200">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                      Agent Pipeline
                    </p>
                    {msg.agentSteps.map((step, i) => (
                      <AgentStepCard
                        key={step.agent}
                        step={step}
                        index={i}
                        isLast={i === msg.agentSteps!.length - 1}
                      />
                    ))}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-[11px] font-medium text-gray-500">
                        Total:{" "}
                        {totalDuration(msg.agentSteps).toLocaleString()} ms
                      </span>
                      <span className="text-[10px] text-gray-400">
                        ({msg.agentSteps.length} agents)
                      </span>
                    </div>
                  </div>
                )}
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
                      Processing through agents...
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
              Test mode — responses are simulated locally. Agent durations are
              approximated.
            </p>
          </div>
        </div>

        {/* Right panel: Agent info */}
        <div className="w-72 flex-shrink-0 overflow-y-auto p-4 space-y-4 hidden lg:block">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Agent Pipeline
            </h3>
            <div className="space-y-3">
              {[
                {
                  name: "Supervise Agent",
                  desc: "Routes incoming messages, manages conversation flow, and decides which agents to invoke.",
                },
                {
                  name: "Intent Agent",
                  desc: "Classifies user intent using NLP. Detects: pricing, shipping, warranty, registration, promotions.",
                },
                {
                  name: "Response Agent",
                  desc: "Generates the final response based on classified intent, product data, and conversation context.",
                },
              ].map((agent) => {
                const config = AGENT_CONFIG[agent.name];
                return (
                  <div
                    key={agent.name}
                    className={cn(
                      "rounded-lg p-3 border",
                      config.bg,
                      config.border
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={config.color}>{config.icon}</span>
                      <span
                        className={cn("text-xs font-semibold", config.color)}
                      >
                        {agent.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      {agent.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Supported Intents
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                "ask_price",
                "ask_promotion",
                "ask_shipping",
                "ask_warranty",
                "ask_registration",
                "ask_product_detail",
                "general_inquiry",
              ].map((intent) => (
                <span
                  key={intent}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono"
                >
                  {intent}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Test Scenarios
            </h3>
            <div className="space-y-1.5">
              {[
                { label: "Price inquiry", msg: "DJI Avata 2 ราคาเท่าไหร่" },
                { label: "Promotion check", msg: "มีโปรโมชั่นอะไรบ้าง" },
                { label: "Shipping query", msg: "ส่งต่างประเทศได้ไหม" },
                { label: "Warranty info", msg: "warranty for DJI Mini 4 Pro?" },
                { label: "Registration", msg: "ลงทะเบียนโดรนยังไง" },
                { label: "Product specs", msg: "DJI Mini 4 Pro สเปคเป็นยังไง" },
              ].map((scenario) => (
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
        </div>
      </div>
    </div>
  );
}
