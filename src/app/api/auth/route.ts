import { NextRequest, NextResponse } from "next/server";
import {
  verifyCredentials,
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE,
} from "@/lib/auth";

export const runtime = "nodejs";

/* ------------------------------------------------------------------ */
/*  Auth API                                                            */
/*  POST — login (username, password)                                   */
/*  GET  — session check (returns current user or 401)                  */
/*  DELETE — logout (clear cookie)                                      */
/* ------------------------------------------------------------------ */

// ── POST: Login ──

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json(
      { error: "Missing username or password" },
      { status: 400 }
    );
  }

  const user = verifyCredentials(username, password);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid credentials", message: "Username หรือ Password ไม่ถูกต้อง" },
      { status: 401 }
    );
  }

  // Create session token
  const token = await createSessionToken(user);

  // Set httpOnly cookie
  const res = NextResponse.json({
    success: true,
    user: {
      username: user.username,
      businessId: user.businessId,
      isSuperAdmin: user.isSuperAdmin,
      allowedBusinessIds: user.allowedBusinessIds,
    },
  });

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return res;
}

// ── GET: Session check ──

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const session = await verifySessionToken(token);
  if (!session) {
    // Token invalid or expired — clear cookie
    const res = NextResponse.json({ authenticated: false }, { status: 401 });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      username: session.username,
      businessId: session.businessId,
      isSuperAdmin: session.isSuperAdmin,
      allowedBusinessIds: session.allowedBusinessIds,
    },
  });
}

// ── DELETE: Logout ──

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
