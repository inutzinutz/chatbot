import ChatWindow from "@/components/ChatWindow";
import { Bot, ShieldAlert } from "lucide-react";

/** Valid embed keys — in production this would be a database lookup */
const VALID_KEYS = new Set([
  "script_4x9xsyeyuk8",
  "script_demo",
  "script_test",
]);

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  const droidId = typeof sp.droidId === "string" ? sp.droidId : "202";

  // Validate embed key
  if (!VALID_KEYS.has(key)) {
    return (
      <div className="h-dvh w-dvw bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3 p-8 max-w-sm">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-sm font-bold text-gray-900">Invalid Embed Key</h1>
          <p className="text-xs text-gray-500">
            The embed key <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600">{key}</code> is
            not valid. Please check your embed script configuration.
          </p>
          <p className="text-[10px] text-gray-400 pt-2">
            Get a valid embed key from DJI 13 STORE Dashboard &rarr; Settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-dvw bg-white flex flex-col">
      {/* Embed branding bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <Bot className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold">DJI 13 STORE</span>
        <span className="text-[9px] text-gray-400 ml-auto">
          Droid #{droidId} &middot; Powered by DroidMind
        </span>
      </div>

      {/* Chat window fills remaining space */}
      <div className="flex-1 min-h-0">
        <ChatWindow />
      </div>

      {/* Hidden metadata for external scripts */}
      <div className="hidden" data-embed-key={key} data-droid-id={droidId} />
    </div>
  );
}
