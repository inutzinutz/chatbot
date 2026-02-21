"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  channels as initialChannels,
  type ChannelInfo,
  type ChannelType,
  type ChannelCommonSettings,
} from "@/lib/channels";
import {
  Globe,
  MessageCircle,
  ArrowLeft,
  Save,
  ToggleLeft,
  ToggleRight,
  Clock,
  MessageSquare,
  Settings2,
  Link2,
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronRight,
  Palette,
  Monitor,
  Smartphone,
  Plus,
  X,
  ExternalLink,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Icons per platform                                                 */
/* ------------------------------------------------------------------ */

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

const PLATFORM_META: Record<
  ChannelType,
  { label: string; color: string; bgLight: string; border: string; icon: React.ReactNode }
> = {
  WEB_EMBED: {
    label: "Web Embed",
    color: "bg-indigo-500",
    bgLight: "bg-indigo-50",
    border: "border-indigo-200",
    icon: <Globe className="h-5 w-5" />,
  },
  FACEBOOK: {
    label: "Facebook Messenger",
    color: "bg-blue-500",
    bgLight: "bg-blue-50",
    border: "border-blue-200",
    icon: <FacebookIcon className="h-5 w-5" />,
  },
  LINE: {
    label: "LINE Official Account",
    color: "bg-green-500",
    bgLight: "bg-green-50",
    border: "border-green-200",
    icon: <LineIcon className="h-5 w-5" />,
  },
};

/* ------------------------------------------------------------------ */
/*  Reusable form helpers                                              */
/* ------------------------------------------------------------------ */

function SectionCard({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-5 py-4 text-left hover:bg-gray-50/60 transition-colors"
      >
        <span className="text-gray-500">{icon}</span>
        <span className="text-sm font-semibold text-gray-900 flex-1">{title}</span>
        <ChevronRight
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform",
            open && "rotate-90"
          )}
        />
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">{children}</div>}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400",
        "focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        mono && "font-mono text-xs"
      )}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none resize-none transition-all"
    />
  );
}

function Toggle({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="flex items-start gap-3 w-full text-left group"
    >
      {enabled ? (
        <ToggleRight className="h-6 w-6 text-indigo-500 shrink-0 mt-0.5" />
      ) : (
        <ToggleLeft className="h-6 w-6 text-gray-300 shrink-0 mt-0.5" />
      )}
      <div>
        <span className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{label}</span>
        {description && <p className="text-[11px] text-gray-400 mt-0.5">{description}</p>}
      </div>
    </button>
  );
}

function SecretField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 pr-10 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-gray-400 hover:text-gray-600 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-sm text-gray-900 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function TagList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !items.includes(v)) {
      onChange([...items, v]);
    }
    setInput("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 rounded-full pl-2.5 pr-1.5 py-1 font-medium"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="hover:text-red-500 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-24 rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2 text-sm text-gray-900 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
      />
      {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Common Settings Section                                            */
/* ------------------------------------------------------------------ */

function CommonSettingsSection({
  common,
  onChange,
}: {
  common: ChannelCommonSettings;
  onChange: (c: ChannelCommonSettings) => void;
}) {
  const update = <K extends keyof ChannelCommonSettings>(
    key: K,
    val: ChannelCommonSettings[K]
  ) => onChange({ ...common, [key]: val });

  const updateScheduleDay = (
    idx: number,
    field: "open" | "close" | "active",
    val: string | boolean
  ) => {
    const schedule = common.businessHours.schedule.map((s, i) =>
      i === idx ? { ...s, [field]: val } : s
    );
    onChange({
      ...common,
      businessHours: { ...common.businessHours, schedule },
    });
  };

  return (
    <>
      {/* Welcome & Auto-reply */}
      <SectionCard title="Messages & Auto-Reply" icon={<MessageSquare className="h-4 w-4" />}>
        <Field label="Welcome Message" hint="Sent when a user first opens the chat">
          <TextArea
            value={common.welcomeMessage}
            onChange={(v) => update("welcomeMessage", v)}
            placeholder="สวัสดีครับ! ..."
          />
        </Field>
        <Toggle
          enabled={common.autoReply}
          onChange={(v) => update("autoReply", v)}
          label="Auto-Reply"
          description="Automatically respond to incoming messages using AI"
        />
        <Field label="Response Delay" hint="Wait before sending AI reply (seconds)">
          <NumberInput
            value={common.responseDelaySec}
            onChange={(v) => update("responseDelaySec", v)}
            min={0}
            max={30}
            suffix="seconds"
          />
        </Field>
        <Field label="Offline Message" hint="Sent when outside business hours (if enabled)">
          <TextArea
            value={common.offlineMessage}
            onChange={(v) => update("offlineMessage", v)}
            placeholder="ขณะนี้อยู่นอกเวลาทำการ ..."
            rows={2}
          />
        </Field>
      </SectionCard>

      {/* Business Hours */}
      <SectionCard title="Business Hours" icon={<Clock className="h-4 w-4" />} defaultOpen={false}>
        <Toggle
          enabled={common.businessHours.enabled}
          onChange={(v) =>
            onChange({
              ...common,
              businessHours: { ...common.businessHours, enabled: v },
            })
          }
          label="Enable Business Hours"
          description="Only auto-reply during active hours; send offline message otherwise"
        />
        <Field label="Timezone">
          <SelectInput
            value={common.businessHours.timezone}
            onChange={(v) =>
              onChange({
                ...common,
                businessHours: { ...common.businessHours, timezone: v },
              })
            }
            options={[
              { value: "Asia/Bangkok", label: "Asia/Bangkok (GMT+7)" },
              { value: "Asia/Tokyo", label: "Asia/Tokyo (GMT+9)" },
              { value: "UTC", label: "UTC (GMT+0)" },
              { value: "America/New_York", label: "America/New_York (EST)" },
            ]}
          />
        </Field>
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700">Weekly Schedule</label>
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {common.businessHours.schedule.map((day, idx) => (
              <div
                key={day.day}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm",
                  !day.active && "opacity-50"
                )}
              >
                <button
                  type="button"
                  onClick={() => updateScheduleDay(idx, "active", !day.active)}
                  className="shrink-0"
                >
                  {day.active ? (
                    <ToggleRight className="h-5 w-5 text-indigo-500" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-300" />
                  )}
                </button>
                <span className="w-24 text-xs font-medium text-gray-700">{day.day}</span>
                <input
                  type="time"
                  value={day.open}
                  onChange={(e) => updateScheduleDay(idx, "open", e.target.value)}
                  disabled={!day.active}
                  className="rounded border border-gray-200 bg-gray-50/60 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-indigo-300 disabled:opacity-40"
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="time"
                  value={day.close}
                  onChange={(e) => updateScheduleDay(idx, "close", e.target.value)}
                  disabled={!day.active}
                  className="rounded border border-gray-200 bg-gray-50/60 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-indigo-300 disabled:opacity-40"
                />
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Platform-specific settings sections                                */
/* ------------------------------------------------------------------ */

function WebEmbedSection({
  channel,
  onChange,
}: {
  channel: ChannelInfo;
  onChange: (ch: ChannelInfo) => void;
}) {
  const web = channel.web!;
  const updateWeb = (patch: Partial<typeof web>) =>
    onChange({ ...channel, web: { ...web, ...patch } });

  return (
    <>
      <SectionCard title="Widget Appearance" icon={<Palette className="h-4 w-4" />}>
        <Field label="Primary Color" hint="Main color for the chat bubble and header">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={web.primaryColor}
              onChange={(e) => updateWeb({ primaryColor: e.target.value })}
              className="h-9 w-9 rounded-lg border border-gray-200 cursor-pointer"
            />
            <TextInput
              value={web.primaryColor}
              onChange={(v) => updateWeb({ primaryColor: v })}
              mono
            />
          </div>
        </Field>
        <Field label="Bubble Icon">
          <SelectInput
            value={web.bubbleIcon}
            onChange={(v) => updateWeb({ bubbleIcon: v as "chat" | "headset" | "bot" })}
            options={[
              { value: "chat", label: "Chat Bubble" },
              { value: "headset", label: "Headset / Support" },
              { value: "bot", label: "Bot / Robot" },
            ]}
          />
        </Field>
        <Field label="Widget Position">
          <SelectInput
            value={web.widgetPosition}
            onChange={(v) =>
              updateWeb({ widgetPosition: v as "bottom-right" | "bottom-left" })
            }
            options={[
              { value: "bottom-right", label: "Bottom Right" },
              { value: "bottom-left", label: "Bottom Left" },
            ]}
          />
        </Field>
        <div className="flex items-center gap-4">
          <Toggle
            enabled={web.showOnMobile}
            onChange={(v) => updateWeb({ showOnMobile: v })}
            label="Show on Mobile"
            description="Display the widget on mobile devices"
          />
        </div>
        <Field label="Auto-Open Delay" hint="Seconds before the widget opens automatically (0 = disabled)">
          <NumberInput
            value={web.autoOpenDelaySec}
            onChange={(v) => updateWeb({ autoOpenDelaySec: v })}
            min={0}
            max={60}
            suffix="seconds"
          />
        </Field>
      </SectionCard>

      <SectionCard title="Embed Configuration" icon={<Link2 className="h-4 w-4" />}>
        <Field label="Channel ID">
          <div className="flex items-center gap-2">
            <TextInput value={web.channelId} onChange={(v) => updateWeb({ channelId: v })} mono />
            <CopyButton text={web.channelId} />
          </div>
        </Field>
        <Field label="Script Key">
          <div className="flex items-center gap-2">
            <TextInput value={web.scriptKey} onChange={(v) => updateWeb({ scriptKey: v })} mono />
            <CopyButton text={web.scriptKey} />
          </div>
        </Field>
        <Field label="Demo Site Path">
          <TextInput
            value={web.demoSitePath}
            onChange={(v) => updateWeb({ demoSitePath: v })}
            mono
          />
        </Field>
        <Field label="Allowed Domains" hint="Leave empty to allow all domains">
          <TagList
            items={web.allowedDomains}
            onChange={(v) => updateWeb({ allowedDomains: v })}
            placeholder="e.g. dji13store.com"
          />
        </Field>
      </SectionCard>
    </>
  );
}

function FacebookSection({
  channel,
  onChange,
}: {
  channel: ChannelInfo;
  onChange: (ch: ChannelInfo) => void;
}) {
  const fb = channel.facebook!;
  const updateFb = (patch: Partial<typeof fb>) =>
    onChange({ ...channel, facebook: { ...fb, ...patch } });

  return (
    <>
      <SectionCard title="Page Connection" icon={<Link2 className="h-4 w-4" />}>
        <Field label="Page ID">
          <div className="flex items-center gap-2">
            <TextInput value={fb.pageId} onChange={(v) => updateFb({ pageId: v })} mono />
            <CopyButton text={fb.pageId} />
          </div>
        </Field>
        <Field label="Page URL">
          <div className="flex items-center gap-2">
            <TextInput
              value={fb.pageUrl}
              onChange={(v) => updateFb({ pageUrl: v })}
              placeholder="https://facebook.com/..."
            />
            {fb.pageUrl && (
              <a
                href={fb.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-500 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </Field>
      </SectionCard>

      <SectionCard title="Authentication" icon={<Shield className="h-4 w-4" />} defaultOpen={false}>
        <Field label="Page Access Token" hint="From Facebook Developer Console">
          <SecretField
            value={fb.pageAccessToken}
            onChange={(v) => updateFb({ pageAccessToken: v })}
            placeholder="EAAxxxxxxx..."
          />
        </Field>
        <Field label="Verify Token" hint="Webhook verification token">
          <SecretField
            value={fb.verifyToken}
            onChange={(v) => updateFb({ verifyToken: v })}
            placeholder="your_verify_token"
          />
        </Field>
      </SectionCard>

      <SectionCard title="Messenger Features" icon={<MessageCircle className="h-4 w-4" />}>
        <Toggle
          enabled={fb.persistentMenu}
          onChange={(v) => updateFb({ persistentMenu: v })}
          label="Persistent Menu"
          description="Show a hamburger menu with quick actions in Messenger"
        />
        <Field label="Get Started Payload" hint="Payload sent when user taps Get Started">
          <TextInput
            value={fb.getStartedPayload}
            onChange={(v) => updateFb({ getStartedPayload: v })}
            mono
          />
        </Field>
        <Field label="Ice Breakers" hint="Quick-start questions shown to new users">
          <TagList
            items={fb.iceBreakers}
            onChange={(v) => updateFb({ iceBreakers: v })}
            placeholder="e.g. สินค้ามีอะไรบ้าง?"
          />
        </Field>
      </SectionCard>
    </>
  );
}

function LineSection({
  channel,
  onChange,
}: {
  channel: ChannelInfo;
  onChange: (ch: ChannelInfo) => void;
}) {
  const line = channel.line!;
  const updateLine = (patch: Partial<typeof line>) =>
    onChange({ ...channel, line: { ...line, ...patch } });

  return (
    <>
      <SectionCard title="Channel Connection" icon={<Link2 className="h-4 w-4" />}>
        <Field label="Channel ID">
          <div className="flex items-center gap-2">
            <TextInput value={line.channelId} onChange={(v) => updateLine({ channelId: v })} mono />
            <CopyButton text={line.channelId} />
          </div>
        </Field>
        <Field label="Webhook URL" hint="Set this URL in LINE Developer Console">
          <div className="flex items-center gap-2">
            <TextInput
              value={line.webhookUrl}
              onChange={(v) => updateLine({ webhookUrl: v })}
              placeholder="https://yourdomain.com/api/line/webhook"
              mono
            />
            {line.webhookUrl && <CopyButton text={line.webhookUrl} />}
          </div>
        </Field>
      </SectionCard>

      <SectionCard title="Authentication" icon={<Shield className="h-4 w-4" />} defaultOpen={false}>
        <Field label="Channel Secret" hint="From LINE Developer Console">
          <SecretField
            value={line.channelSecret}
            onChange={(v) => updateLine({ channelSecret: v })}
            placeholder="xxxxxxxxxxxxxxxx"
          />
        </Field>
        <Field label="Channel Access Token">
          <SecretField
            value={line.accessToken}
            onChange={(v) => updateLine({ accessToken: v })}
            placeholder="xxxxxxxxxxxxxxxx"
          />
        </Field>
      </SectionCard>

      <SectionCard title="LINE Features" icon={<Settings2 className="h-4 w-4" />}>
        <Toggle
          enabled={line.richMenuEnabled}
          onChange={(v) => updateLine({ richMenuEnabled: v })}
          label="Rich Menu"
          description="Display a rich menu at the bottom of the chat"
        />
        {line.richMenuEnabled && (
          <Field label="Rich Menu ID" hint="Created via LINE Messaging API">
            <TextInput
              value={line.richMenuId}
              onChange={(v) => updateLine({ richMenuId: v })}
              placeholder="richmenu-xxxxxxxx"
              mono
            />
          </Field>
        )}
        <Toggle
          enabled={line.useReplyApi}
          onChange={(v) => updateLine({ useReplyApi: v })}
          label="Use Reply API"
          description="Use Reply API (free) instead of Push API when possible"
        />
      </SectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Channel Detail View                                                */
/* ------------------------------------------------------------------ */

function ChannelDetail({
  channel,
  onChange,
  onBack,
}: {
  channel: ChannelInfo;
  onChange: (ch: ChannelInfo) => void;
  onBack: () => void;
}) {
  const meta = PLATFORM_META[channel.type];
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div
            className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center text-white",
              meta.color
            )}
          >
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <input
                value={channel.name}
                onChange={(e) => onChange({ ...channel, name: e.target.value })}
                className="text-lg font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full"
              />
            </div>
            <span className="text-[11px] text-gray-400">{meta.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onChange({ ...channel, enabled: !channel.enabled })}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                channel.enabled
                  ? "bg-green-50 text-green-600 hover:bg-green-100"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              )}
            >
              {channel.enabled ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              {channel.enabled ? "Active" : "Disabled"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all",
                saved
                  ? "bg-green-500 text-white"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
              )}
            >
              {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? "Saved!" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Settings content */}
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {/* Platform-specific settings */}
        {channel.type === "WEB_EMBED" && channel.web && (
          <WebEmbedSection channel={channel} onChange={onChange} />
        )}
        {channel.type === "FACEBOOK" && channel.facebook && (
          <FacebookSection channel={channel} onChange={onChange} />
        )}
        {channel.type === "LINE" && channel.line && (
          <LineSection channel={channel} onChange={onChange} />
        )}

        {/* Common settings */}
        <CommonSettingsSection
          common={channel.common}
          onChange={(common) => onChange({ ...channel, common })}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Channel List View                                                  */
/* ------------------------------------------------------------------ */

function ChannelCard({
  channel,
  onClick,
  onToggle,
}: {
  channel: ChannelInfo;
  onClick: () => void;
  onToggle: () => void;
}) {
  const meta = PLATFORM_META[channel.type];

  return (
    <div
      className={cn(
        "bg-white rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md group",
        channel.enabled ? "border-gray-200" : "border-gray-200 opacity-70"
      )}
    >
      {/* Color accent bar */}
      <div className={cn("h-1", meta.color)} />

      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0",
              meta.color
            )}
          >
            {meta.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{channel.name}</span>
              <span
                className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full",
                  meta.bgLight,
                  meta.border,
                  "border"
                )}
              >
                {meta.label}
              </span>
            </div>

            {/* Quick info */}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
              {channel.type === "WEB_EMBED" && channel.web && (
                <>
                  <span>Script: {channel.web.scriptKey}</span>
                  <span>Position: {channel.web.widgetPosition}</span>
                  <span className="flex items-center gap-1">
                    {channel.web.showOnMobile ? (
                      <Smartphone className="h-3 w-3" />
                    ) : (
                      <Monitor className="h-3 w-3" />
                    )}
                    {channel.web.showOnMobile ? "Mobile + Desktop" : "Desktop only"}
                  </span>
                </>
              )}
              {channel.type === "FACEBOOK" && channel.facebook && (
                <>
                  <span>Page ID: {channel.facebook.pageId}</span>
                  <span>{channel.facebook.iceBreakers.length} ice breakers</span>
                  <span>Menu: {channel.facebook.persistentMenu ? "On" : "Off"}</span>
                </>
              )}
              {channel.type === "LINE" && channel.line && (
                <>
                  <span>Channel: {channel.line.channelId}</span>
                  <span>Rich Menu: {channel.line.richMenuEnabled ? "On" : "Off"}</span>
                  <span>Reply API: {channel.line.useReplyApi ? "On" : "Off"}</span>
                </>
              )}
            </div>

            {/* Common info */}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Auto-reply: {channel.common.autoReply ? "On" : "Off"}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Hours: {channel.common.businessHours.enabled ? "Enabled" : "24/7"}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className={cn(
                "flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors",
                channel.enabled
                  ? "bg-green-50 text-green-600 hover:bg-green-100"
                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              )}
            >
              {channel.enabled ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              {channel.enabled ? "Active" : "Off"}
            </button>
            <button
              type="button"
              onClick={onClick}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main ChannelsPage                                                  */
/* ------------------------------------------------------------------ */

export default function ChannelsPage() {
  const [channelList, setChannelList] = useState<ChannelInfo[]>(
    () => initialChannels.map((ch) => structuredClone(ch))
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateChannel = useCallback(
    (idx: number, updated: ChannelInfo) => {
      setChannelList((prev) => prev.map((ch, i) => (i === idx ? updated : ch)));
    },
    []
  );

  const toggleChannel = useCallback(
    (idx: number) => {
      setChannelList((prev) =>
        prev.map((ch, i) => (i === idx ? { ...ch, enabled: !ch.enabled } : ch))
      );
    },
    []
  );

  /* Detail view */
  if (editingIndex !== null) {
    const ch = channelList[editingIndex];
    if (!ch) {
      setEditingIndex(null);
      return null;
    }
    return (
      <ChannelDetail
        channel={ch}
        onChange={(updated) => updateChannel(editingIndex, updated)}
        onBack={() => setEditingIndex(null)}
      />
    );
  }

  /* List view */
  const activeCount = channelList.filter((c) => c.enabled).length;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Channels</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Connected platforms for DJI 13 STORE
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              {activeCount} of {channelList.length} active
            </span>
          </div>
        </div>

        {/* Channel cards */}
        <div className="space-y-4">
          {channelList.map((ch, idx) => (
            <ChannelCard
              key={ch.type}
              channel={ch}
              onClick={() => setEditingIndex(idx)}
              onToggle={() => toggleChannel(idx)}
            />
          ))}
        </div>

        {/* Info note */}
        <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 px-5 py-4">
          <p className="text-xs text-indigo-600 leading-relaxed">
            <strong>Tip:</strong> Click <strong>Configure</strong> on any channel to access detailed
            settings including authentication tokens, appearance customization, business hours,
            welcome messages, and platform-specific features.
          </p>
        </div>
      </div>
    </div>
  );
}
