import ChatWindow from "@/components/ChatWindow";
import { Bot, ShieldAlert } from "lucide-react";

interface EmbedConfig {
  businessId: string;
  name: string;
  color: string;
}

/** Map of valid embed keys to their business config */
const EMBED_KEY_MAP: Record<string, EmbedConfig> = {
  script_4x9xsyeyuk8: { businessId: "dji13store",     name: "DJI 13 STORE",          color: "#ef4444" },
  script_demo:        { businessId: "dji13store",     name: "DJI 13 STORE Demo",     color: "#ef4444" },
  script_test:        { businessId: "dji13store",     name: "DJI 13 STORE Test",     color: "#ef4444" },
  evlifethailand:     { businessId: "evlifethailand", name: "EV Life Thailand",       color: "#f97316" },
  evlife_demo:        { businessId: "evlifethailand", name: "EV Life Thailand Demo",  color: "#f97316" },
};

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

  const config = EMBED_KEY_MAP[key];

  // Validate embed key
  if (!config) {
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
            Get a valid embed key from your Dashboard &rarr; Settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-dvw bg-white flex flex-col">
      {/* Embed branding bar */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-white"
        style={{ background: `linear-gradient(135deg, ${config.color}dd, ${config.color})` }}
      >
        <Bot className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold">{config.name}</span>
        <span className="text-[9px] opacity-70 ml-auto">
          Droid #{droidId} &middot; Powered by DroidMind
        </span>
      </div>

      {/* Chat window fills remaining space */}
      <div className="flex-1 min-h-0">
        <ChatWindow businessId={config.businessId} />
      </div>

      {/* Hidden metadata for external scripts */}
      <div className="hidden" data-embed-key={key} data-droid-id={droidId} data-business-id={config.businessId} />
    </div>
  );
}
