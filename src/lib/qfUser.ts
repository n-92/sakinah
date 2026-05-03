/**
 * Server-side proxy to Quran Foundation User APIs.
 * Base URL is `${QF_API_BASE}/auth/v1/...` per the published OpenAPI spec.
 * Required headers: `x-auth-token` (access token) and `x-client-id`.
 */

import { QF_API_BASE, QF_CLIENT_ID } from "./qfAuth";
import { getValidAccessToken } from "./qfSession";

const USER_API_ROOT = `${QF_API_BASE}/auth/v1`;

export class QfApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`QF User API ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

async function call<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  opts: { body?: unknown; query?: Record<string, string>; timezone?: string } = {},
): Promise<T> {
  const token = await getValidAccessToken();
  if (!token) throw new QfApiError(401, "Not signed in.");

  const url = new URL(USER_API_ROOT + path);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = {
    "x-auth-token": token,
    "x-client-id": QF_CLIENT_ID,
    accept: "application/json",
  };
  if (opts.timezone) headers["x-timezone"] = opts.timezone;
  if (opts.body !== undefined) headers["content-type"] = "application/json";

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new QfApiError(res.status, text);
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export type ActivityDayPayload = {
  type: "QURAN";
  seconds: number;
  ranges: string; // "2:1-2:5,3:10-3:12"
  mushafId: number; // 4 = UthmaniHafs
  date?: string;
};

export async function postActivityDay(p: ActivityDayPayload, timezone?: string) {
  return call<{ success: boolean }>("POST", "/activity-days", {
    body: p,
    timezone,
  });
}

export async function getCurrentStreak(timezone?: string): Promise<number> {
  const r = await call<{ success: boolean; data?: { days?: number } }>(
    "GET",
    "/streaks/current-streak-days",
    { query: { type: "QURAN" }, timezone },
  );
  return r.data?.days ?? 0;
}

export async function getActivityDays(opts: {
  from: string;
  to: string;
  timezone?: string;
}): Promise<Array<{ date: string }>> {
  const r = await call<{ success: boolean; data?: Array<{ date: string }> }>(
    "GET",
    "/activity-days",
    { query: { from: opts.from, to: opts.to, type: "QURAN" }, timezone: opts.timezone },
  );
  return r.data ?? [];
}
