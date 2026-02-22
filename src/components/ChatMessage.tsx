"use client";

import { cn } from "@/lib/utils";
import { Bot, User, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { PipelineTrace } from "@/lib/inspector";
import PipelineTracePanel from "./PipelineTrace";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
  timestamp?: string;
  trace?: PipelineTrace;
  showTrace?: boolean; // default false — only admin views pass true
}

function formatMessage(content: string) {
  let html = content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/~~(.*?)~~/g, "<del>$1</del>")
    .replace(/\n/g, "<br/>")
    .replace(/<br\/>---<br\/>/g, '<hr class="my-2 border-gray-200"/>');
  return html;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
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

export default function ChatMessage({
  role,
  content,
  isLoading,
  timestamp,
  trace,
  showTrace = false,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-2.5 transition-colors",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm",
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white"
            : "bg-gradient-to-br from-gray-800 to-black text-white"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Message bubble */}
      <div className={cn("max-w-[80%] flex flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative",
            isUser
              ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-md shadow-sm shadow-indigo-200/50"
              : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md"
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-2 py-1 px-1">
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-[bounce_1.4s_ease-in-out_infinite]" />
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
              </div>
              <span className="text-xs text-gray-400 animate-pulse">
                กำลังคิด...
              </span>
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none [&_strong]:font-semibold [&_del]:text-gray-400 [&_del]:line-through [&_hr]:my-2"
              dangerouslySetInnerHTML={{ __html: formatMessage(content) }}
            />
          )}
        </div>

        {/* Meta row: timestamp + copy + pipeline trace */}
        {!isLoading && content && (
          <div
            className={cn(
              "flex items-center gap-1.5 mt-1 px-1",
              isUser ? "flex-row-reverse" : "flex-row"
            )}
          >
            {timestamp && (
              <span className="text-[10px] text-gray-300">{timestamp}</span>
            )}
            {!isUser && <CopyButton text={content} />}
          </div>
        )}

        {/* Pipeline Trace Panel — only for admin views (showTrace=true) */}
        {!isUser && !isLoading && trace && showTrace && (
          <PipelineTracePanel trace={trace} />
        )}
      </div>
    </div>
  );
}
