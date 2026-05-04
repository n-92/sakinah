"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { storage, type Bookmark } from "@/lib/storage";
import { userClient } from "@/lib/userClient";
import { surahName } from "@/lib/quranMeta";

export default function BookmarksPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBookmarks(storage.listBookmarks());

    (async () => {
      try {
        const meR = await fetch("/api/auth/me", { cache: "no-store" });
        const me = meR.ok
          ? ((await meR.json()) as { signedIn?: boolean })
          : { signedIn: false };
        if (cancelled) return;
        setSignedIn(Boolean(me.signedIn));

        if (me.signedIn) {
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

              const missing = merged
                .filter((b) => !b.arabic || !b.translation)
                .map((b) => b.ayah_key);
              if (missing.length > 0) {
                const vR = await fetch(
                  "/api/verses?keys=" +
                    encodeURIComponent(missing.slice(0, 50).join(",")),
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
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load bookmarks.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(key: string) {
    if (deletingKey) return;
    setDeletingKey(key);
    try {
      storage.removeBookmark(key);
      setBookmarks(storage.listBookmarks());
      if (signedIn) {
        await userClient.deleteBookmarkByKey(key).catch((e) => {
          console.error("delete bookmark failed:", e);
        });
      }
    } finally {
      setDeletingKey(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Your bookmarks</h1>
            <p className="text-slate-400 text-sm mt-1">
              Every ayah you&rsquo;ve saved.{" "}
              {signedIn ? (
                <>
                  Synced with{" "}
                  <span className="text-emerald-300">Quran.Foundation</span>.
                </>
              ) : (
                <>Saved on this device.</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/library"
              className="text-sm text-amber-300 hover:text-amber-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 rounded px-3 py-2"
            >
              📓 Reflections
            </Link>
            <Link
              href="/"
              className="text-sm text-amber-300 hover:text-amber-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 rounded px-3 py-2"
            >
              ← Home
            </Link>
          </div>
        </header>

        {loading && <p className="text-slate-400">Loading…</p>}

        {!loading && error && (
          <section className="rounded-2xl border border-red-500/40 bg-red-500/5 p-6 text-red-200">
            ⚠ {error}
          </section>
        )}

        {!loading && bookmarks.length === 0 && !error && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
            You haven&rsquo;t saved any bookmarks yet. From any ayah in the player,
            press{" "}
            <kbd className="px-1 py-0.5 rounded bg-slate-800 text-amber-200">B</kbd>{" "}
            to save it.
            {signedIn === false && (
              <p className="text-sm text-slate-500 mt-3">
                Tip:{" "}
                <Link
                  href="/api/auth/login"
                  className="underline hover:text-amber-100"
                >
                  sign in
                </Link>{" "}
                so your bookmarks follow you across devices.
              </p>
            )}
          </section>
        )}

        {!loading && bookmarks.length > 0 && (
          <ul className="flex flex-col gap-3">
            {bookmarks.map((b) => {
              const [s, a] = b.ayah_key.split(":").map(Number);
              return (
                <li
                  key={b.ayah_key}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-mono">
                      {b.ayah_key}{" "}
                      <span className="text-slate-500">
                        · {surahName(s)} {a}
                      </span>
                    </span>
                    {b.saved_at && (
                      <span className="text-slate-500">
                        {formatDate(b.saved_at)}
                      </span>
                    )}
                  </div>
                  {b.arabic && (
                    <p
                      lang="ar"
                      dir="rtl"
                      className="text-2xl leading-loose text-emerald-100"
                      style={{ fontFamily: "'Amiri', 'Scheherazade', serif" }}
                    >
                      {b.arabic}
                    </p>
                  )}
                  {b.translation && (
                    <p className="text-sm text-slate-300 italic leading-relaxed">
                      “{b.translation}”
                    </p>
                  )}
                  {b.mood && (
                    <div className="text-slate-500 text-xs">
                      saved for: {b.mood}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => remove(b.ayah_key)}
                      disabled={deletingKey === b.ayah_key}
                      className="text-xs text-red-400 hover:text-red-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400 rounded px-2 py-1 disabled:opacity-50"
                      aria-label={`Remove bookmark ${b.ayah_key}`}
                    >
                      {deletingKey === b.ayah_key ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
