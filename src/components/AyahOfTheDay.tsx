"use client";

import { useEffect, useState } from "react";
import type { SearchResponse } from "@/lib/types";
import { surahName } from "@/lib/quranMeta";

type Aod = SearchResponse & { date: string };

export default function AyahOfTheDay({
  onPlay,
}: {
  onPlay: (data: SearchResponse) => void;
}) {
  const [aod, setAod] = useState<Aod | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/aod", { cache: "no-store" });
        if (!r.ok) {
          setError(`HTTP ${r.status}`);
          return;
        }
        const data = (await r.json()) as Aod;
        if (!cancelled) setAod(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error || !aod || aod.ayahs.length === 0) return null;
  const first = aod.ayahs[0];
  const passage = aod.passages?.[0];
  const niceDate = new Date(aod.date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section
      aria-label="Ayah of the day"
      className="w-full max-w-3xl rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.07] to-emerald-500/[0.05] p-6 sm:p-8"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-amber-300/80 mb-4">
        <span>✦ Ayah for today</span>
        <span className="text-slate-500 normal-case tracking-normal">{niceDate}</span>
      </div>

      <p
        dir="rtl"
        lang="ar"
        className="font-serif text-2xl sm:text-3xl leading-[2.1] text-slate-50 text-right mb-4"
        style={{ fontFamily: "'Amiri', 'Scheherazade', serif" }}
      >
        {first.arabic}
      </p>
      <p className="text-base text-slate-200 leading-relaxed">
        {first.translations[0]?.text}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {passage
          ? `Sūrah ${passage.surah} · ${surahName(passage.surah)} ${passage.start}${
              passage.end !== passage.start ? `–${passage.end}` : ""
            }`
          : ""}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onPlay(aod)}
          className="rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 px-5 py-2 text-sm text-amber-100 focus-visible:outline-amber-300"
        >
          ▶ Listen now
        </button>
      </div>
    </section>
  );
}
