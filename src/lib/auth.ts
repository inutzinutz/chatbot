/* ------------------------------------------------------------------ */
/*  Auth — Simple JWT-based authentication for DroidMind dashboard     */
/*                                                                      */
/*  Env vars:                                                           */
/*    AUTH_SECRET — JWT signing secret (required)                       */
/*    AUTH_USERS  — Comma-separated user list:                          */
/*      businessId:username:password,businessId:username:password,...   */
/*      Use "*" as businessId for super admin (all businesses)         */
/*                                                                      */
/*  Example:                                                            */
/*    AUTH_USERS=dji13store:admin:dji13store,evlifethailand:admin:evlifethailand,*:superadmin:droidmind2025
/* ------------------------------------------------------------------ */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export interface AuthUser {
  username: string;
  businessId: string; // "*" for super admin
  isSuperAdmin: boolean;
  allowedBusinessIds: string[];
}

export interface SessionPayload {
  username: string;
  businessId: string;
  isSuperAdmin: boolean;
  allowedBusinessIds: string[];
  exp: number;
}

// ── Parse AUTH_USERS env var ──

function parseUsers(): { businessId: string; username: string; password: string }[] {
  const raw = process.env.AUTH_USERS || "";
  if (!raw) return [];

  return raw.split(",").map((entry) => {
    const [businessId, username, ...passwordParts] = entry.trim().split(":");
    return { businessId, username, password: passwordParts.join(":") };
  }).filter((u) => u.businessId && u.username && u.password);
}

// ── Verify credentials ──

export function verifyCredentials(
  username: string,
  password: string
): AuthUser | null {
  const users = parseUsers();
  const match = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!match) return null;

  const isSuperAdmin = match.businessId === "*";

  // Super admin can access all businesses
  const allBusinessIds = ["dji13store", "evlifethailand", "dji13service"];
  const allowedBusinessIds = isSuperAdmin
    ? allBusinessIds
    : [match.businessId];

  return {
    username: match.username,
    businessId: isSuperAdmin ? allBusinessIds[0] : match.businessId,
    isSuperAdmin,
    allowedBusinessIds,
  };
}

// ── JWT-like token using HMAC-SHA256 (Web Crypto API) ──

function getSecret(): string {
  return process.env.AUTH_SECRET || "droidmind-default-secret-change-me";
}

async function hmacSign(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmacVerify(payload: string, signature: string): Promise<boolean> {
  const expected = await hmacSign(payload);
  return expected === signature;
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  const pad = str.length % 4;
  const padded = str + "=".repeat(pad ? 4 - pad : 0);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  const payload: SessionPayload = {
    username: user.username,
    businessId: user.businessId,
    isSuperAdmin: user.isSuperAdmin,
    allowedBusinessIds: user.allowedBusinessIds,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };

  const payloadStr = base64UrlEncode(JSON.stringify(payload));
  const sig = await hmacSign(payloadStr);
  return `${payloadStr}.${sig}`;
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadStr, sig] = parts;

  const valid = await hmacVerify(payloadStr, sig);
  if (!valid) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadStr)) as SessionPayload;

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ── Cookie name ──

export const SESSION_COOKIE = "droidmind_session";

// ── Admin guard — call at top of admin route handlers ──
//
// Returns the verified session or null if unauthorized.
// Cross-business check: if businessId is provided, verify the session's
// allowedBusinessIds includes it (super-admin always allowed).
//
// Usage:
//   const session = await requireAdminSession(req, businessId);
//   if (!session) return unauthorizedResponse();

export async function requireAdminSession(
  req: NextRequest,
  businessId?: string | null
): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  // Cross-business check
  if (businessId && !session.isSuperAdmin) {
    if (!session.allowedBusinessIds.includes(businessId)) return null;
  }

  return session;
}

export function unauthorizedResponse(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
