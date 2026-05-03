"use client";

import { useEffect, useState } from "react";
import { storage, type Bookmark, type MoodCollection, type StreakState } from "@/lib/storage";

export default function UserPanel({
  refreshKey,
  onPlayCollection,
}: {
  refreshKey: number;
  onPlayCollection: (mood: string) => void;
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [collections, setCollections] = useState<MoodCollection[]>([]);
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    setBookmarks(storage.listBookmarks());
    setCollections(storage.listCollections());
    setStreak(storage.getStreak()); // optimistic local read

    // Try the remote QF User API; if signed in, override.
    let cancelled = false;
    (async () => {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const r = await fetch(
          "/api/user/streak" + (tz ? `?tz=${encodeURIComponent(tz)}` : ""),
          { cache: "no-store" },
        );
        if (!r.ok) return;
        const data = (await r.json()) as {
          ok: boolean;
          current_streak: number;
          total_sessions: number;
        };
        if (cancelled || !data.ok) return;
        setStreak({
          current_streak: data.current_streak,
          longest_streak: data.current_streak,
          last_active_day: null,
          total_sessions: data.total_sessions,
        });
        setSynced(true);
      } catch {
        /* offline / not signed in — keep local */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <aside
      aria-label="Your saved Qur'an"
      className="w-full max-w-3xl flex flex-col gap-6"
    >
      <section
        aria-label="Daily streak"
        className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 flex flex-col gap-2"
      >
        <div className="flex justify-around text-center">
          <Stat label="Current streak" value={`${streak?.current_streak ?? 0} 🔥`} />
          <Stat label="Total sessions" value={`${streak?.total_sessions ?? 0}`} />
        </div>
        <div className="text-center text-[10px] uppercase tracking-widest">
          {synced ? (
            <span className="text-emerald-400" title="Streak from Quran Foundation">
              ✓ synced with Quran.Foundation
            </span>
          ) : (
            <span className="text-slate-600">local only · sign in to sync</span>
          )}
        </div>
      </section>

      {collections.length > 0 && (
        <section aria-label="Saved collections" className="flex flex-col gap-2">
          <h3 className="text-sm uppercase tracking-wider text-slate-400">
            Saved collections
          </h3>
          <ul className="flex flex-wrap gap-2">
            {collections.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPlayCollection(c.name)}
                  className="px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-slate-100 hover:bg-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 text-sm"
                  aria-label={`Replay collection: ${c.name}`}
                >
                  {c.name} · {c.ayah_keys.length}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bookmarks.length > 0 && (
        <section aria-label="Bookmarks" className="flex flex-col gap-2">
          <h3 className="text-sm uppercase tracking-wider text-slate-400">
            Bookmarks
          </h3>
          <ul className="flex flex-col gap-2">
            {bookmarks.slice(0, 5).map((b) => (
              <li
                key={b.ayah_key}
                className="rounded-xl bg-slate-900/50 border border-slate-800 p-3"
              >
                <div className="text-amber-300 text-xs">{b.ayah_key}</div>
                <div className="text-slate-200 text-sm line-clamp-2">{b.translation}</div>
                {b.mood && (
                  <div className="text-slate-500 text-xs mt-1">saved for: {b.mood}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-medium text-slate-100">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}
