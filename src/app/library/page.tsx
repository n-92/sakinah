"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { userClient, type RemoteNote } from "@/lib/userClient";

type VerseText = { arabic: string; translation: string };

export default function LibraryPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [notes, setNotes] = useState<RemoteNote[]>([]);
  const [verses, setVerses] = useState<Record<string, VerseText>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meR = await fetch("/api/auth/me", { cache: "no-store" });
        const me = meR.ok ? ((await meR.json()) as { signedIn?: boolean }) : { signedIn: false };
        if (cancelled) return;
        setSignedIn(Boolean(me.signedIn));
        if (!me.signedIn) {
          setLoading(false);
          return;
        }
        const r = await userClient.listAllReflections();
        if (cancelled) return;
        if (r === null) {
          setSignedIn(false);
          return;
        }
        setNotes(r.notes);

        // Fetch verse text for each unique key referenced by the notes.
        const keys = Array.from(
          new Set(
            r.notes
              .map((n) => parseFirstVerseKey(n.ranges))
              .filter((k): k is string => Boolean(k)),
          ),
        );
        if (keys.length > 0) {
          const vR = await fetch(
            "/api/verses?keys=" + encodeURIComponent(keys.slice(0, 50).join(",")),
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
              const map: Record<string, VerseText> = {};
              for (const a of vData.ayahs) {
                map[a.ayah_key] = {
                  arabic: a.arabic,
                  translation: a.translations[0]?.text ?? "",
                };
              }
              setVerses(map);
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load reflections.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id: string) {
    setBusyId(id);
    try {
      const r = await userClient.deleteReflection(id);
      if (r) setNotes((prev) => prev.filter((n) => n.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Your reflections</h1>
            <p className="text-slate-400 text-sm mt-1">
              All notes you&rsquo;ve written across the Qur&rsquo;an, synced with{" "}
              <span className="text-emerald-300">Quran.Foundation</span>.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-amber-300 hover:text-amber-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300 rounded px-3 py-2"
          >
            ← Home
          </Link>
        </header>

        {loading && <p className="text-slate-400">Loading…</p>}

        {!loading && signedIn === false && (
          <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6">
            <p className="text-amber-200">
              Reflections are stored in your Quran.Foundation account.{" "}
              <Link href="/api/auth/login" className="underline hover:text-amber-100">
                Sign in
              </Link>{" "}
              to view and write reflections.
            </p>
          </section>
        )}

        {!loading && error && (
          <section className="rounded-2xl border border-red-500/40 bg-red-500/5 p-6 text-red-200">
            ⚠ {error}
          </section>
        )}

        {!loading && signedIn && notes.length === 0 && !error && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
            You haven&rsquo;t written any reflections yet. From any ayah in the player,
            press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-amber-200">N</kbd>{" "}
            to add one.
          </section>
        )}

        {!loading && signedIn && notes.length > 0 && (
          <ul className="flex flex-col gap-3">
            {notes.map((n) => {
              const verseKey = parseFirstVerseKey(n.ranges);
              const verse = verseKey ? verses[verseKey] : undefined;
              return (
                <li
                  key={n.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-mono">{verseKey ?? "—"}</span>
                    <span className="text-slate-500">{formatDate(n.createdAt)}</span>
                  </div>
                  {verse?.arabic && (
                    <p
                      lang="ar"
                      dir="rtl"
                      className="text-2xl leading-loose text-emerald-100 font-arabic"
                    >
                      {verse.arabic}
                    </p>
                  )}
                  {verse?.translation && (
                    <p className="text-sm text-slate-300 italic leading-relaxed">
                      “{verse.translation}”
                    </p>
                  )}
                  <div className="rounded-xl bg-slate-950/60 border border-amber-500/10 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-amber-300/70 mb-1">
                      Your reflection
                    </div>
                    <p className="text-slate-100 whitespace-pre-wrap">{n.body}</p>
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => remove(n.id)}
                      disabled={busyId === n.id}
                      className="text-xs text-red-400 hover:text-red-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400 rounded px-2 py-1 disabled:opacity-50"
                      aria-label="Delete reflection"
                    >
                      {busyId === n.id ? "Deleting…" : "Delete"}
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

function parseFirstVerseKey(ranges?: string[]): string | null {
  if (!ranges || ranges.length === 0) return null;
  const first = ranges[0];
  const m = first.match(/^(\d+:\d+)/);
  return m ? m[1] : null;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
