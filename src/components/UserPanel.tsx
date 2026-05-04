"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    setBookmarks(storage.listBookmarks());
    setCollections(storage.listCollections());
    setStreak(storage.getStreak()); // optimistic local read

    let cancelled = false;
    (async () => {
      // 1) Source of truth for sign-in state: the auth cookie.
      try {
        const meR = await fetch("/api/auth/me", { cache: "no-store" });
        if (meR.ok) {
          const me = (await meR.json()) as { signedIn?: boolean };
          if (!cancelled) setSignedIn(Boolean(me.signedIn));
        } else if (!cancelled) {
          setSignedIn(false);
        }
      } catch {
        if (!cancelled) setSignedIn(false);
      }

      // 2) Independently try to pull the live streak from QF.
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const r = await fetch(
          "/api/user/streak" + (tz ? `?tz=${encodeURIComponent(tz)}` : ""),
          { cache: "no-store" },
        );
        if (r.ok) {
          const data = (await r.json()) as {
            ok: boolean;
            current_streak: number;
            total_sessions: number;
          };
          if (!cancelled && data.ok) {
            setStreak({
              current_streak: data.current_streak,
              longest_streak: data.current_streak,
              last_active_day: null,
              total_sessions: data.total_sessions,
            });
            setSynced(true);
          }
        }
      } catch {
        /* offline / not signed in — keep local */
      }
      if (cancelled) return;

      // 3) Hydrate bookmarks from Quran.Foundation so they survive
      //    cookie/localStorage clears across devices.
      try {
        const r = await fetch("/api/user/bookmarks", { cache: "no-store" });
        if (r.ok) {
          const data = (await r.json()) as {
            ok: boolean;
            bookmarks?: Array<{ key: number; verseNumber?: number }>;
          };
          if (!cancelled && data.ok && data.bookmarks) {
            const remote = data.bookmarks
              .filter((b) => typeof b.verseNumber === "number")
              .map((b) => ({ surah: b.key, ayah: b.verseNumber as number }));
            storage.mergeRemoteBookmarks(remote);
            const merged = storage.listBookmarks();
            setBookmarks(merged);

            // Fetch arabic + translation for entries we know nothing about yet.
            const missing = merged
              .filter((b) => !b.arabic || !b.translation)
              .map((b) => b.ayah_key);
            if (missing.length > 0) {
              const vR = await fetch(
                "/api/verses?keys=" + encodeURIComponent(missing.slice(0, 50).join(",")),
                { cache: "force-cache" },
              );
              if (vR.ok) {
                const vData = (await vR.json()) as {
                  ok: boolean;
                  ayahs?: Array<{
                    ayah_key: string;
                    arabic: string;
                    translations: Array<{ text: string }>;
                  }>;
                };
                if (!cancelled && vData.ok && vData.ayahs) {
                  for (const a of vData.ayahs) {
                    storage.updateBookmarkText(
                      a.ayah_key,
                      a.arabic,
                      a.translations[0]?.text ?? "",
                    );
                  }
                  setBookmarks(storage.listBookmarks());
                }
              }
            }
          }
        }
      } catch {
        /* silent */
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
          ) : signedIn ? (
            <span className="text-amber-400/80" title="Signed in — streak will sync shortly">
              ✓ signed in · syncing…
            </span>
          ) : signedIn === false ? (
            <span className="text-slate-600">local only · sign in to sync</span>
          ) : (
            <span className="text-slate-600">…</span>
          )}
        </div>
        <div className="text-center mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <Link
            href="/library"
            className="inline-block text-xs text-amber-300 hover:text-amber-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 rounded px-2 py-1"
          >
            📓 View all reflections
          </Link>
          <Link
            href="/bookmarks"
            className="inline-block text-xs text-amber-300 hover:text-amber-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 rounded px-2 py-1"
          >
            🔖 View all bookmarks
            {bookmarks.length > 0 && (
              <span className="ml-1 text-slate-500">({bookmarks.length})</span>
            )}
          </Link>
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
