import { NextRequest, NextResponse } from "next/server";
import { chatStore } from "@/lib/chatStore";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/*  LINE Rich Menu API — /api/line/richmenu/[businessId]              */
/*                                                                      */
/*  GET  → list existing rich menus for the bot                       */
/*  POST → create a new rich menu + set as default                    */
/*  PUT  → link an existing richMenuId as the default                 */
/*  DELETE → unlink default rich menu                                 */
/* ------------------------------------------------------------------ */

type RouteContext = { params: Promise<{ businessId: string }> };

function envKey(businessId: string, suffix: string): string {
  return `${businessId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_${suffix}`;
}

function getAccessToken(businessId: string): string {
  return (
    (process.env as Record<string, string | undefined>)[
      envKey(businessId, "LINE_CHANNEL_ACCESS_TOKEN")
    ] ||
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    ""
  );
}

// ── GET: list rich menus ──

export async function GET(_req: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;
  const accessToken = getAccessToken(businessId);
  if (!accessToken) {
    return NextResponse.json({ error: "LINE access token not configured" }, { status: 500 });
  }

  try {
    const [listRes, defaultRes] = await Promise.all([
      fetch("https://api.line.me/v2/bot/richmenu/list", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch("https://api.line.me/v2/bot/user/all/richmenu", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    const list = listRes.ok ? await listRes.json() : { richmenus: [] };
    const defaultMenu = defaultRes.ok ? await defaultRes.json().catch(() => null) : null;
    const savedSettings = await chatStore.getLineSettings(businessId);

    return NextResponse.json({
      richmenus: list.richmenus ?? [],
      defaultRichMenuId: defaultMenu?.richMenuId ?? null,
      savedRichMenuId: savedSettings?.richMenuId ?? "",
      savedRichMenuEnabled: savedSettings?.richMenuEnabled ?? false,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: create + set as default rich menu ──
// Body: { richMenuId?: string } — if provided, just set the existing one as default.
//        If no richMenuId, creates a minimal placeholder rich menu.

export async function POST(req: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;
  const accessToken = getAccessToken(businessId);
  if (!accessToken) {
    return NextResponse.json({ error: "LINE access token not configured" }, { status: 500 });
  }

  let body: { richMenuId?: string; richMenuObject?: Record<string, unknown> } = {};
  try {
    body = await req.json();
  } catch { /* empty body ok */ }

  try {
    let richMenuId = body.richMenuId;

    if (!richMenuId) {
      // Create a minimal rich menu (1 area placeholder)
      const createBody = body.richMenuObject ?? {
        size: { width: 2500, height: 843 },
        selected: true,
        name: `${businessId} Rich Menu`,
        chatBarText: "เมนู",
        areas: [
          {
            bounds: { x: 0, y: 0, width: 2500, height: 843 },
            action: { type: "message", text: "เมนู" },
          },
        ],
      };

      const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(createBody),
      });

      if (!createRes.ok) {
        const errText = await createRes.text().catch(() => "");
        return NextResponse.json(
          { error: `Failed to create rich menu: ${createRes.status} ${errText}` },
          { status: createRes.status }
        );
      }

      const created = await createRes.json();
      richMenuId = created.richMenuId as string;
    }

    // Set as default rich menu for all users
    const setDefaultRes = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const setOk = setDefaultRes.ok;
    if (!setOk) {
      const errText = await setDefaultRes.text().catch(() => "");
      return NextResponse.json(
        { error: `Failed to set default rich menu: ${setDefaultRes.status} ${errText}` },
        { status: setDefaultRes.status }
      );
    }

    // Persist richMenuId in LINE settings
    const existing = await chatStore.getLineSettings(businessId);
    if (existing) {
      await chatStore.setLineSettings(businessId, {
        ...existing,
        richMenuId,
        richMenuEnabled: true,
      });
    }

    return NextResponse.json({ ok: true, richMenuId, setAsDefault: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── PUT: link an existing richMenuId as default ──
// Body: { richMenuId: string }

export async function PUT(req: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;
  const accessToken = getAccessToken(businessId);
  if (!accessToken) {
    return NextResponse.json({ error: "LINE access token not configured" }, { status: 500 });
  }

  let body: { richMenuId?: string } = {};
  try {
    body = await req.json();
  } catch { /* empty */ }

  const { richMenuId } = body;
  if (!richMenuId) {
    return NextResponse.json({ error: "richMenuId is required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `LINE API error: ${res.status} ${errText}` },
        { status: res.status }
      );
    }

    // Persist
    const existing = await chatStore.getLineSettings(businessId);
    if (existing) {
      await chatStore.setLineSettings(businessId, {
        ...existing,
        richMenuId,
        richMenuEnabled: true,
      });
    }

    return NextResponse.json({ ok: true, richMenuId, linked: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── DELETE: unlink default rich menu ──

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { businessId } = await context.params;
  const accessToken = getAccessToken(businessId);
  if (!accessToken) {
    return NextResponse.json({ error: "LINE access token not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Persist — clear richMenuId and disable
    const existing = await chatStore.getLineSettings(businessId);
    if (existing) {
      await chatStore.setLineSettings(businessId, {
        ...existing,
        richMenuId: "",
        richMenuEnabled: false,
      });
    }

    return NextResponse.json({ ok: true, unlinked: true, status: res.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
