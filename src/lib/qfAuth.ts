/**
 * Quran Foundation OAuth2 (Authorization Code + PKCE) helpers.
 *
 * Confidential client: backend exchanges the code with HTTP Basic
 * (`client_id:client_secret`) credentials. Tokens never reach the browser
 * directly — they are stored in `httpOnly` cookies set by the callback route.
 */

import crypto from "node:crypto";

export const QF_AUTH_BASE =
  process.env.QF_AUTH_BASE ?? "https://prelive-oauth2.quran.foundation";
export const QF_API_BASE =
  process.env.QF_API_BASE ?? "https://apis-prelive.quran.foundation";
export const QF_CLIENT_ID = process.env.QF_CLIENT_ID ?? "";
export const QF_CLIENT_SECRET = process.env.QF_CLIENT_SECRET ?? "";
export const QF_REDIRECT_URI =
  process.env.QF_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback";

export const QF_SCOPES =
  "openid offline_access user collection bookmark reading_session preference streak activity_day note";

export type TokenSet = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  /** epoch ms when access_token expires */
  expires_at: number;
};

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(
    crypto.createHash("sha256").update(verifier).digest(),
  );
  return { verifier, challenge };
}

export function generateState(): string {
  return b64url(crypto.randomBytes(16));
}

export function buildAuthorizeUrl(opts: {
  state: string;
  challenge: string;
}): string {
  const url = new URL("/oauth2/auth", QF_AUTH_BASE);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", QF_CLIENT_ID);
  url.searchParams.set("redirect_uri", QF_REDIRECT_URI);
  url.searchParams.set("scope", QF_SCOPES);
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge", opts.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function basicAuthHeader(): string {
  const raw = `${QF_CLIENT_ID}:${QF_CLIENT_SECRET}`;
  return "Basic " + Buffer.from(raw, "utf8").toString("base64");
}

async function tokenRequest(form: Record<string, string>): Promise<TokenSet> {
  const body = new URLSearchParams(form).toString();
  const res = await fetch(`${QF_AUTH_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: basicAuthHeader(),
      accept: "application/json",
    },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`QF token endpoint ${res.status}: ${text}`);
  }
  const json = JSON.parse(text) as Omit<TokenSet, "expires_at">;
  return {
    ...json,
    expires_at: Date.now() + (json.expires_in - 30) * 1000,
  };
}

export async function exchangeCode(opts: {
  code: string;
  verifier: string;
}): Promise<TokenSet> {
  return tokenRequest({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: QF_REDIRECT_URI,
    code_verifier: opts.verifier,
    client_id: QF_CLIENT_ID,
  });
}

export async function refreshTokens(refreshToken: string): Promise<TokenSet> {
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: QF_CLIENT_ID,
    scope: QF_SCOPES,
  });
}

export type IdTokenClaims = {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
};

/** Decode JWT payload without verifying signature. Safe because the token came
 *  from our backend's own token-exchange call over TLS. */
export function decodeIdToken(idToken: string): IdTokenClaims | null {
  try {
    const [, payload] = idToken.split(".");
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json) as IdTokenClaims;
  } catch {
    return null;
  }
}
