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

export type ReadingPlanType = "khatm-30"; // 1 juz' / day, 30-day khatm

export type ReadingPlan = {
  type: ReadingPlanType;
  started_at: string; // YYYY-MM-DD (UTC)
  // Days the user has marked complete, as YYYY-MM-DD strings.
  // The plan is sequential: completedDays.length === current juz' index - 1.
  completed_days: string[];
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
  removeBookmark(ayah_key: string): void {
    const list = storage.listBookmarks().filter((b) => b.ayah_key !== ayah_key);
    write("bookmarks", list);
  },
  /**
   * Update the arabic / translation text for an existing bookmark
   * (e.g. after we've fetched the verse content for a remote-only entry).
   */
  updateBookmarkText(ayah_key: string, arabic: string, translation: string): void {
    const list = storage.listBookmarks();
    const idx = list.findIndex((b) => b.ayah_key === ayah_key);
    if (idx < 0) return;
    list[idx] = { ...list[idx], arabic, translation };
    write("bookmarks", list);
  },
  /**
   * Merge bookmarks fetched from Quran.Foundation into localStorage.
   * Existing local entries (with their arabic/translation/mood) win;
   * remote-only entries are added with empty arabic/translation
   * (UI degrades gracefully — only the ayah_key is shown until the
   * user opens the player for that ayah).
   */
  mergeRemoteBookmarks(remote: Array<{ surah: number; ayah: number }>): number {
    const local = storage.listBookmarks();
    const have = new Set(local.map((b) => b.ayah_key));
    let added = 0;
    for (const r of remote) {
      const key = `${r.surah}:${r.ayah}`;
      if (!have.has(key)) {
        local.push({
          ayah_key: key,
          arabic: "",
          translation: "",
          saved_at: Date.now(),
        });
        have.add(key);
        added += 1;
      }
    }
    if (added > 0) write("bookmarks", local);
    return added;
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

  // Playback preferences
  getTtsEnabled(): boolean {
    return read<boolean>("tts_enabled", true);
  },
  setTtsEnabled(v: boolean): void {
    write("tts_enabled", v);
  },

  // Reading plan
  getPlan(): ReadingPlan | null {
    return read<ReadingPlan | null>("reading_plan", null);
  },
  startPlan(type: ReadingPlanType = "khatm-30"): ReadingPlan {
    const today = new Date().toISOString().slice(0, 10);
    const plan: ReadingPlan = {
      type,
      started_at: today,
      completed_days: [],
    };
    write("reading_plan", plan);
    return plan;
  },
  cancelPlan(): void {
    write<ReadingPlan | null>("reading_plan", null);
  },
  /**
   * Mark today's reading complete. Idempotent — calling twice on the same
   * day is a no-op. Returns the updated plan.
   */
  markPlanDayComplete(): ReadingPlan | null {
    const plan = storage.getPlan();
    if (!plan) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (plan.completed_days.includes(today)) return plan;
    plan.completed_days = [...plan.completed_days, today];
    write("reading_plan", plan);
    return plan;
  },
};
