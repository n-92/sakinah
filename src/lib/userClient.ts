/**
 * Client-side wrapper around our /api/user/* endpoints.
 * Each call attempts the QF-backed route first; on 401 (guest) it returns
 * `null` so the caller can fall back to local storage.
 */

export type RemoteBookmark = {
  id: string;
  type: string;
  key: number;
  verseNumber?: number;
};

export type RemoteNote = {
  id: string;
  body: string;
  ranges?: string[];
  createdAt?: string;
};

async function jsonOrNull<T>(res: Response): Promise<T | null> {
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const userClient = {
  async addBookmark(surah: number, ayah: number) {
    const res = await fetch("/api/user/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surah, ayah }),
    });
    return jsonOrNull<{ ok: true; bookmark: RemoteBookmark }>(res);
  },
  async listBookmarks() {
    const res = await fetch("/api/user/bookmarks");
    return jsonOrNull<{ ok: true; bookmarks: RemoteBookmark[] }>(res);
  },
  async deleteBookmark(id: string) {
    const res = await fetch(`/api/user/bookmarks?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return jsonOrNull<{ ok: true }>(res);
  },
  async deleteBookmarkByKey(verseKey: string) {
    const res = await fetch(`/api/user/bookmarks?key=${encodeURIComponent(verseKey)}`, {
      method: "DELETE",
    });
    return jsonOrNull<{ ok: true; removed?: boolean }>(res);
  },
  async createCollection(name: string, ayahs: { surah: number; ayah: number }[]) {
    const res = await fetch("/api/user/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ayahs }),
    });
    return jsonOrNull<{ ok: true; collection: { id: string; name: string } }>(res);
  },
  async addReflection(verseKey: string, body: string) {
    const res = await fetch("/api/user/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verseKey, body }),
    });
    return jsonOrNull<{ ok: true; note: RemoteNote }>(res);
  },
  async listReflections(verseKey: string) {
    const res = await fetch(
      `/api/user/notes?verseKey=${encodeURIComponent(verseKey)}`,
    );
    return jsonOrNull<{ ok: true; notes: RemoteNote[] }>(res);
  },
  async listAllReflections() {
    const res = await fetch(`/api/user/notes`);
    return jsonOrNull<{ ok: true; notes: RemoteNote[]; nextCursor?: string }>(res);
  },
  async deleteReflection(id: string) {
    const res = await fetch(`/api/user/notes?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return jsonOrNull<{ ok: true }>(res);
  },
};
