/**
 * Server-side session helpers backed by signed httpOnly cookies.
 *
 * Two cookies:
 *  - `qf_session`  → JSON { access_token, refresh_token, expires_at, sub, email, name }
 *  - `qf_pkce`     → JSON { verifier, state } — written before redirect, cleared in callback.
 *
 * Both are signed (HMAC-SHA256) with SESSION_SECRET so a tampered cookie is rejected.
 */

import crypto from "node:crypto";
import { cookies } from "next/headers";
import {
  decodeIdToken,
  refreshTokens,
  type TokenSet,
} from "./qfAuth";

const SECRET = process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me";
const SESSION_COOKIE = "qf_session";
const PKCE_COOKIE = "qf_pkce";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionData = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  sub: string;
  email?: string;
  name?: string;
};

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function pack(data: unknown): string {
  const payload = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function unpack<T>(value: string | undefined): T | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function setPkceCookie(verifier: string, state: string) {
  const store = await cookies();
  store.set(PKCE_COOKIE, pack({ verifier, state }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
}

export async function readPkceCookie(): Promise<{ verifier: string; state: string } | null> {
  const store = await cookies();
  const raw = store.get(PKCE_COOKIE)?.value;
  return unpack<{ verifier: string; state: string }>(raw);
}

export async function clearPkceCookie() {
  const store = await cookies();
  store.delete(PKCE_COOKIE);
}

export async function setSessionFromTokens(t: TokenSet) {
  const claims = t.id_token ? decodeIdToken(t.id_token) : null;
  if (!claims?.sub) {
    throw new Error("ID token missing 'sub' claim — cannot establish session.");
  }
  const data: SessionData = {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: t.expires_at,
    sub: claims.sub,
    email: claims.email,
    name:
      claims.name ??
      ([claims.first_name, claims.last_name].filter(Boolean).join(" ") ||
        undefined),
  };
  const store = await cookies();
  store.set(SESSION_COOKIE, pack(data), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function readSession(): Promise<SessionData | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return unpack<SessionData>(raw);
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Get a valid access token, refreshing transparently if expired.
 * Returns null if there is no session at all.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const session = await readSession();
  if (!session) return null;
  if (session.expires_at > Date.now() + 5_000) return session.access_token;
  if (!session.refresh_token) return null;
  try {
    const fresh = await refreshTokens(session.refresh_token);
    const merged: SessionData = {
      ...session,
      access_token: fresh.access_token,
      refresh_token: fresh.refresh_token ?? session.refresh_token,
      expires_at: fresh.expires_at,
    };
    const store = await cookies();
    store.set(SESSION_COOKIE, pack(merged), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });
    return merged.access_token;
  } catch {
    await clearSession();
    return null;
  }
}
