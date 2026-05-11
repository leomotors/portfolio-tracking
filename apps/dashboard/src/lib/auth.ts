import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const COOKIE_NAMES = {
  session: "pt_session",
  state: "pt_oauth_state",
  returnTo: "pt_oauth_return_to",
} as const;

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const STATE_TTL_SECONDS = 600;

export interface SessionPayload {
  uid: string;
  exp: number;
  name?: string;
  avatar?: string | null;
}

function b64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return b64urlEncode(new Uint8Array(sig));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signSession(
  payload: SessionPayload,
  secret: string,
): Promise<string> {
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSha256(secret, body);
  return `${body}.${sig}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = await hmacSha256(secret, body);
  if (!constantTimeEqual(sig, expected)) return null;
  try {
    const json = new TextDecoder().decode(b64urlDecode(body));
    const payload = JSON.parse(json) as SessionPayload;
    if (typeof payload.uid !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseAllowedUserIds(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return ids.length > 0 ? ids : null;
}

export function randomState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64urlEncode(bytes);
}

// Next.js 16's dev server binds to 0.0.0.0 by default and uses that bind
// hostname for `request.url`, ignoring the browser's Host header. Use the
// forwarded/Host headers instead so redirects stay on the user-facing origin.
export function getRequestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto = forwardedProto ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function sanitizeReturnTo(value: string | undefined | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function getSession(): Promise<SessionPayload | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  const store = await cookies();
  const token = store.get(COOKIE_NAMES.session)?.value;
  return verifySession(token, secret);
}

export function discordAvatarUrl(
  uid: string,
  avatar: string | null | undefined,
  size = 64,
): string | null {
  if (!avatar) return null;
  return `https://cdn.discordapp.com/avatars/${uid}/${avatar}.png?size=${size}`;
}
