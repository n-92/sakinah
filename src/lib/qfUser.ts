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

// ─── Bookmarks ──────────────────────────────────────────────────────────
export type QfBookmark = {
  id: string;
  type: "ayah" | "surah" | "juz" | "page";
  key: number;
  verseNumber?: number;
  mushafId?: number;
  createdAt?: string;
};

export async function addBookmark(opts: {
  surah: number;
  ayah: number;
  mushafId?: number;
}): Promise<void> {
  // Use the default ("Favorites") collection — this is the QF-recommended
  // way to create a Quran.com-style saved/favorite ayah bookmark.
  // Standalone POST /bookmarks creates a bookmark that isn't in the
  // user's Favorites and behaves more like a transient reading marker.
  await call<{ success: boolean; data: { message: string } }>(
    "POST",
    "/collections/__default__/bookmarks",
    {
      body: {
        type: "ayah",
        key: opts.surah,
        verseNumber: opts.ayah,
        mushafId: opts.mushafId ?? 4,
      },
    },
  );
}

/**
 * Create a standalone bookmark (returns the bookmark id).
 * Used when we then need to attach it to a non-default collection.
 */
export async function addStandaloneBookmark(opts: {
  surah: number;
  ayah: number;
  mushafId?: number;
}): Promise<QfBookmark> {
  const r = await call<{ success: boolean; data: QfBookmark }>("POST", "/bookmarks", {
    body: {
      type: "ayah",
      key: opts.surah,
      verseNumber: opts.ayah,
      mushafId: opts.mushafId ?? 4,
    },
  });
  return r.data;
}

export async function listBookmarks(mushafId = 4): Promise<QfBookmark[]> {
  // Page through all bookmarks. QF caps `first` at 20.
  const all: QfBookmark[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 10; i += 1) {
    const query: Record<string, string> = {
      type: "ayah",
      mushafId: String(mushafId),
      first: "20",
    };
    if (cursor) query.after = cursor;
    const r = await call<{
      success: boolean;
      data?: QfBookmark[];
      pagination?: { endCursor?: string; hasNextPage?: boolean };
    }>("GET", "/bookmarks", { query });
    const page = r.data ?? [];
    all.push(...page);
    if (!r.pagination?.hasNextPage || !r.pagination.endCursor || page.length === 0) break;
    cursor = r.pagination.endCursor;
  }
  return all;
}

export async function deleteBookmark(bookmarkId: string): Promise<void> {
  await call<{ success: boolean }>(
    "DELETE",
    `/collections/__default__/bookmarks/${encodeURIComponent(bookmarkId)}`,
  );
}

// ─── Collections ────────────────────────────────────────────────────────
export type QfCollection = { id: string; name: string; createdAt?: string };

export async function createCollection(name: string): Promise<QfCollection> {
  const r = await call<{ success: boolean; data: QfCollection }>("POST", "/collections", {
    body: { name },
  });
  return r.data;
}

export async function addBookmarkToCollection(
  collectionId: string,
  bookmarkId: string,
): Promise<void> {
  await call<{ success: boolean }>(
    "POST",
    `/collections/${encodeURIComponent(collectionId)}/bookmarks`,
    { body: { bookmarkId } },
  );
}

// ─── Notes (used as "Reflections") ──────────────────────────────────────
export type QfNote = {
  id: string;
  body: string;
  ranges?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export async function addNote(body: string, ranges: string[]): Promise<QfNote> {
  const r = await call<{ success: boolean; data: QfNote }>("POST", "/notes", {
    body: { body, ranges },
  });
  return r.data;
}

export async function getNotesByVerse(verseKey: string): Promise<QfNote[]> {
  const r = await call<{ success: boolean; data?: QfNote[] }>(
    "GET",
    `/notes/by-verse/${encodeURIComponent(verseKey)}`,
    { query: { verseKey } },
  );
  return r.data ?? [];
}

export async function listAllNotes(opts: {
  cursor?: string;
  limit?: number;
  sortBy?: "newest" | "oldest";
} = {}): Promise<{ notes: QfNote[]; nextCursor?: string }> {
  const query: Record<string, string> = {
    limit: String(opts.limit ?? 50),
    sortBy: opts.sortBy ?? "newest",
  };
  if (opts.cursor) query.cursor = opts.cursor;
  const r = await call<{
    success: boolean;
    data?: QfNote[];
    pagination?: { nextCursor?: string };
  }>("GET", "/notes", { query });
  return { notes: r.data ?? [], nextCursor: r.pagination?.nextCursor };
}

export async function deleteNote(noteId: string): Promise<void> {
  await call<{ success: boolean }>("DELETE", `/notes/${encodeURIComponent(noteId)}`);
}
