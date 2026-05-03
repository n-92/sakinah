/**
 * Local user layer — abstracted so it can later be swapped for Quran
 * Foundation's User APIs (OAuth2-protected bookmarks, collections, goals).
 *
 * For the demo we persist to localStorage. The interface intentionally mirrors
 * the QF User API resource names: bookmarks, collections, streak/activity.
 */

import type { Ayah } from "./types";

const NS = "sakinah:v1";

export type Bookmark = {
  ayah_key: string;
  arabic: string;
  translation: string;
  saved_at: number;
  mood?: string;
};

export type MoodCollection = {
  id: string;
  name: string; // the original mood phrase
  ayah_keys: string[];
  created_at: number;
};

export type StreakState = {
  current_streak: number;
  longest_streak: number;
  last_active_day: string | null; // YYYY-MM-DD
  total_sessions: number;
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${NS}:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${NS}:${key}`, JSON.stringify(value));
  } catch {
    // quota or privacy mode — silent
  }
}

export const storage = {
  // Bookmarks
  listBookmarks(): Bookmark[] {
    return read<Bookmark[]>("bookmarks", []);
  },
  toggleBookmark(ayah: Ayah, mood?: string): boolean {
    const list = storage.listBookmarks();
    const existing = list.findIndex((b) => b.ayah_key === ayah.ayah_key);
    if (existing >= 0) {
      list.splice(existing, 1);
      write("bookmarks", list);
      return false;
    }
    list.unshift({
      ayah_key: ayah.ayah_key,
      arabic: ayah.arabic,
      translation: ayah.translations[0]?.text ?? "",
      saved_at: Date.now(),
      mood,
    });
    write("bookmarks", list);
    return true;
  },
  isBookmarked(ayah_key: string): boolean {
    return storage.listBookmarks().some((b) => b.ayah_key === ayah_key);
  },

  // Mood collections
  listCollections(): MoodCollection[] {
    return read<MoodCollection[]>("collections", []);
  },
  saveMoodCollection(name: string, ayah_keys: string[]): MoodCollection {
    const list = storage.listCollections();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const coll: MoodCollection = { id, name, ayah_keys, created_at: Date.now() };
    list.unshift(coll);
    write("collections", list);
    return coll;
  },
  deleteCollection(id: string): void {
    write(
      "collections",
      storage.listCollections().filter((c) => c.id !== id),
    );
  },

  // Streak / activity goals
  getStreak(): StreakState {
    return read<StreakState>("streak", {
      current_streak: 0,
      longest_streak: 0,
      last_active_day: null,
      total_sessions: 0,
    });
  },
  recordSession(): StreakState {
    const today = new Date().toISOString().slice(0, 10);
    const s = storage.getStreak();
    if (s.last_active_day === today) {
      s.total_sessions += 1;
    } else {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      if (s.last_active_day === yesterday) {
        s.current_streak += 1;
      } else {
        s.current_streak = 1;
      }
      s.longest_streak = Math.max(s.longest_streak, s.current_streak);
      s.last_active_day = today;
      s.total_sessions += 1;
    }
    write("streak", s);
    return s;
  },
};
