"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Paperclip, X, FileText, Image } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AttachedFile {
  name: string;
  mimeType: string;
  dataBase64: string;  // base64 WITHOUT the "data:...;base64," prefix
  previewUrl?: string; // object URL for image previews
  sizeLabel: string;
}

interface ChatInputProps {
  onSend: (message: string, file?: AttachedFile) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const ACCEPTED = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
].join(",");

const MAX_MB = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "พิมพ์ข้อความ... (Enter เพื่อส่ง)",
  maxLength = 500,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attached, setAttached] = useState<AttachedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (attached?.previewUrl) URL.revokeObjectURL(attached.previewUrl);
    };
  }, [attached]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    e.target.value = ""; // reset so same file can be re-selected
    if (!file) return;

    setFileError(null);

    if (file.size > MAX_MB * 1024 * 1024) {
      setFileError(`ไฟล์ใหญ่เกิน ${MAX_MB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix
      const base64 = result.split(",")[1] ?? "";
      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined;

      if (attached?.previewUrl) URL.revokeObjectURL(attached.previewUrl);

      setAttached({
        name: file.name,
        mimeType: file.type,
        dataBase64: base64,
        previewUrl,
        sizeLabel: formatBytes(file.size),
      });
    };
    reader.onerror = () => setFileError("อ่านไฟล์ไม่ได้ กรุณาลองใหม่");
    reader.readAsDataURL(file);
  };

  const removeAttached = () => {
    if (attached?.previewUrl) URL.revokeObjectURL(attached.previewUrl);
    setAttached(null);
    setFileError(null);
  };

  const handleSubmit = () => {
    const trimmed = input.trim();
    if ((!trimmed && !attached) || disabled) return;
    onSend(trimmed, attached ?? undefined);
    setInput("");
    removeAttached();
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = (input.trim() || attached) && !disabled;

  return (
    <div className="border-t border-gray-100 bg-white/80 backdrop-blur-sm p-3">
      {/* File preview strip */}
      {attached && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          {attached.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attached.previewUrl}
              alt={attached.name}
              className="h-10 w-10 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
              <FileText className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium text-gray-800">{attached.name}</p>
            <p className="text-xs text-gray-400">{attached.sizeLabel}</p>
          </div>
          <button
            onClick={removeAttached}
            className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* File error */}
      {fileError && (
        <p className="mb-2 text-xs text-red-500">{fileError}</p>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50/80 px-3 py-2 focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 transition-all duration-200">
        <Sparkles className="h-4 w-4 text-gray-300 shrink-0 mb-1" />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          placeholder={attached ? "พิมพ์คำถามเกี่ยวกับไฟล์ (หรือกด Send เลย)" : placeholder}
          disabled={disabled}
          rows={1}
          maxLength={maxLength}
          className={cn(
            "flex-1 resize-none bg-transparent text-sm outline-none",
            "placeholder:text-gray-400",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />

        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="แนบรูปภาพหรือ PDF (สูงสุด 10MB)"
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
            attached
              ? "bg-indigo-100 text-indigo-600"
              : "text-gray-400 hover:bg-gray-200 hover:text-gray-600",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {attached?.previewUrl ? (
            <Image className="h-3.5 w-3.5" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
            canSend
              ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-md shadow-indigo-200/50 scale-100"
              : "bg-transparent text-gray-300 cursor-not-allowed scale-90"
          )}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
