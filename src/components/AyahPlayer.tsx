"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ayahAudioUrl, RECITERS } from "@/lib/audio";
import { speak, stopSpeaking } from "@/lib/speech";
import { storage } from "@/lib/storage";
import { surahName } from "@/lib/quranMeta";
import type { Ayah, DuaMeta } from "@/lib/types";

type Props = {
  ayahs: Ayah[];
  mood: string;
  passages?: { surah: number; start: number; end: number }[];
  duas?: DuaMeta[];
  onClose: () => void;
};

type Phase = "arabic" | "english" | "between" | "idle";

export default function AyahPlayer({ ayahs, mood, passages, duas, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [playing, setPlaying] = useState(false);
  const [reciter, setReciter] = useState("alafasy");

  // Auto-switch reciter when the active du'ā recommends one.
  useEffect(() => {
    if (!duas || !passages || duas.length === 0) return;
    const cur = ayahs[index];
    if (!cur) return;
    const idx = passages.findIndex(
      (p) => p.surah === cur.surah && cur.ayah >= p.start && cur.ayah <= p.end,
    );
    const recommended = idx >= 0 ? duas[idx]?.reciter : undefined;
    if (recommended && recommended !== reciter) setReciter(recommended);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, ayahs, duas, passages]);
  const [bookmarkedKeys, setBookmarkedKeys] = useState<Set<string>>(
    () => new Set(storage.listBookmarks().map((b) => b.ayah_key)),
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);

  const current = ayahs[index];
  const arabicUrl = useMemo(
    () => (current ? ayahAudioUrl(current.ayah_key, reciter) : ""),
    [current, reciter],
  );

  useEffect(() => {
    storage.recordSession();
    // Best-effort push to Quran Foundation Activity Days. Fails silently for guests.
    const ranges =
      passages && passages.length > 0
        ? passages.map((p) => `${p.surah}:${p.start}-${p.surah}:${p.end}`).join(",")
        : ayahs.length > 0
          ? `${ayahs[0].surah}:${ayahs[0].ayah}-${ayahs[ayahs.length - 1].surah}:${ayahs[ayahs.length - 1].ayah}`
          : "1:1-1:1";
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch("/api/user/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seconds: Math.max(30, ayahs.length * 20),
        ranges,
        mushafId: 4,
        timezone: tz,
      }),
    }).catch(() => {
      /* silent — guest user */
    });
    return () => {
      cancelledRef.current = true;
      stopSpeaking();
      audioRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing || !current) return;
    cancelledRef.current = false;
    let cancelled = false;

    async function run() {
      // 1. Arabic recitation
      setPhase("arabic");
      const audio = new Audio(arabicUrl);
      audioRef.current = audio;
      audio.preload = "auto";
      try {
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error("Arabic audio failed to load"));
          audio.play().catch(reject);
        });
      } catch {
        // audio failed — continue anyway so the user gets translation
      }
      if (cancelled || cancelledRef.current) return;

      // 2. Short breath
      setPhase("between");
      await wait(500);
      if (cancelled || cancelledRef.current) return;

      // 3. English translation via SpeechSynthesis
      setPhase("english");
      const text = current.translations[0]?.text ?? "";
      if (text) await speak(text, { rate: 0.9 });
      if (cancelled || cancelledRef.current) return;

      // 4. Pause, then advance
      setPhase("between");
      await wait(900);
      if (cancelled || cancelledRef.current) return;
      if (index < ayahs.length - 1) {
        setIndex((i) => i + 1);
      } else {
        setPlaying(false);
        setPhase("idle");
        await speak("That was the last ayah. May it bring you peace.", { rate: 0.95 });
      }
    }
    run();

    return () => {
      cancelled = true;
      cancelledRef.current = true;
      stopSpeaking();
      audioRef.current?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, arabicUrl]);

  function play() {
    setPlaying(true);
  }
  function pause() {
    setPlaying(false);
    cancelledRef.current = true;
    audioRef.current?.pause();
    stopSpeaking();
    setPhase("idle");
  }
  function next() {
    pause();
    if (index < ayahs.length - 1) setIndex(index + 1);
  }
  function prev() {
    pause();
    if (index > 0) setIndex(index - 1);
  }
  function repeat() {
    pause();
    setTimeout(() => setPlaying(true), 50);
  }
  function toggleBookmark() {
    if (!current) return;
    const isNowSaved = storage.toggleBookmark(current, mood);
    const next = new Set(bookmarkedKeys);
    if (isNowSaved) next.add(current.ayah_key);
    else next.delete(current.ayah_key);
    setBookmarkedKeys(next);
    void speak(isNowSaved ? "Bookmarked." : "Bookmark removed.", { rate: 1.0 });
  }
  function saveCollection() {
    const coll = storage.saveMoodCollection(
      mood,
      ayahs.map((a) => a.ayah_key),
    );
    void speak(`Saved this playlist as a collection: ${coll.name}.`, { rate: 0.95 });
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === " ") {
        e.preventDefault();
        playing ? pause() : play();
      } else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key.toLowerCase() === "r") repeat();
      else if (e.key.toLowerCase() === "b") toggleBookmark();
      else if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, index, current]);

  if (!current) return null;
  const bookmarked = bookmarkedKeys.has(current.ayah_key);

  // Identify which du'ā (if any) corresponds to the currently playing ayah.
  const activeDua = (() => {
    if (!duas || !passages || duas.length === 0) return null;
    const idx = passages.findIndex(
      (p) =>
        p.surah === current.surah &&
        current.ayah >= p.start &&
        current.ayah <= p.end,
    );
    return idx >= 0 ? duas[idx] ?? null : null;
  })();

  return (
    <section
      aria-label="Qur'an player"
      className="flex flex-col gap-8 w-full max-w-3xl"
    >
      <header className="flex items-center justify-between text-sm text-slate-400 flex-wrap gap-2">
        <span>
          For: <em className="text-slate-200 not-italic">{mood}</em>
        </span>
        {passages && passages.length > 0 && (
          <span className="text-xs text-slate-500">
            {passages.length === 1
              ? `Sūrah ${passages[0].surah} · ${surahName(passages[0].surah)} ${passages[0].start}–${passages[0].end}`
              : `${passages.length} passages: ${passages.map((p) => `${surahName(p.surah)} ${p.start}–${p.end}`).join(" · ")}`}
          </span>
        )}
        <span aria-live="polite">
          Ayah {index + 1} of {ayahs.length}
        </span>
      </header>

      {activeDua && (
        <aside
          aria-label="Du'ā context"
          className="rounded-2xl bg-emerald-950/40 border border-emerald-900/60 px-5 py-4"
        >
          <div className="text-emerald-300 text-xs uppercase tracking-widest mb-1">
            🤲 Duʿā
          </div>
          <h4 className="text-emerald-100 font-medium">{activeDua.title}</h4>
          <p className="text-slate-300 text-sm mt-1 leading-snug">
            {activeDua.context}
          </p>
          {activeDua.hadith && (
            <p className="text-slate-400 text-xs mt-2 leading-snug italic">
              {activeDua.hadith}
            </p>
          )}
        </aside>
      )}

      <article
        aria-labelledby="ayah-ref"
        className="rounded-3xl bg-slate-900/70 border border-slate-700 p-8 sm:p-12 shadow-2xl"
      >
        <h3 id="ayah-ref" className="text-amber-300 text-lg font-medium mb-6">
          Sūrah {current.surah} · {surahName(current.surah)} · Ayah {current.ayah}
        </h3>

        <p
          dir="rtl"
          lang="ar"
          className="font-serif text-3xl sm:text-4xl leading-[2.2] text-slate-50 text-right mb-8"
          style={{ fontFamily: "'Amiri', 'Scheherazade', serif" }}
        >
          {current.arabic}
        </p>

        <p className="text-lg sm:text-xl text-slate-200 leading-relaxed">
          {current.translations[0]?.text}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          — {current.translations[0]?.edition_name}
        </p>

        <p
          aria-live="polite"
          className="mt-6 text-sm text-emerald-300"
          aria-atomic="true"
        >
          {phase === "arabic" && "🔊 Reciting in Arabic…"}
          {phase === "english" && "🔊 Reading the translation…"}
          {phase === "between" && "…"}
          {phase === "idle" && (playing ? "Loading…" : "Paused")}
        </p>
      </article>

      <div
        role="toolbar"
        aria-label="Playback controls"
        className="flex flex-wrap gap-3 justify-center"
      >
        <Button onClick={prev} ariaLabel="Previous ayah (Left arrow)">
          ⏮ Prev
        </Button>
        {playing ? (
          <Button onClick={pause} ariaLabel="Pause (Space)" primary>
            ⏸ Pause
          </Button>
        ) : (
          <Button onClick={play} ariaLabel="Play (Space)" primary>
            ▶ Play
          </Button>
        )}
        <Button onClick={repeat} ariaLabel="Repeat ayah (R)">
          ↺ Repeat
        </Button>
        <Button onClick={next} ariaLabel="Next ayah (Right arrow)">
          Next ⏭
        </Button>
        <Button
          onClick={toggleBookmark}
          ariaLabel={bookmarked ? "Remove bookmark (B)" : "Bookmark this ayah (B)"}
        >
          {bookmarked ? "★ Saved" : "☆ Bookmark"}
        </Button>
        <Button onClick={saveCollection} ariaLabel="Save this whole playlist as a collection">
          💾 Save playlist
        </Button>
        <Button onClick={onClose} ariaLabel="Close player (Escape)">
          ✕ Close
        </Button>
      </div>

      <div className="flex justify-center">
        <label className="flex items-center gap-3 text-sm text-slate-400">
          Reciter:
          <select
            value={reciter}
            onChange={(e) => setReciter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details className="text-sm text-slate-400">
        <summary className="cursor-pointer focus-visible:outline-amber-300">
          Keyboard shortcuts
        </summary>
        <ul className="mt-2 ml-4 list-disc space-y-1">
          <li>Space — play / pause</li>
          <li>← / → — previous / next ayah</li>
          <li>R — repeat current ayah</li>
          <li>B — bookmark / unbookmark</li>
          <li>Esc — close player</li>
        </ul>
      </details>
    </section>
  );
}

function Button({
  children,
  onClick,
  ariaLabel,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        "px-5 py-3 rounded-xl text-base font-medium",
        "focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300",
        primary
          ? "bg-amber-300 text-slate-900 hover:bg-amber-200"
          : "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
