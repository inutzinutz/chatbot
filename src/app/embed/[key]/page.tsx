import ChatWindow from "@/components/ChatWindow";

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

  return (
    <div className="h-dvh w-dvw bg-white">
      <div className="hidden" data-embed-key={key} data-droid-id={droidId} />
      <ChatWindow />
    </div>
  );
}
