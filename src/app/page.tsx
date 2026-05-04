"use client";

import { useState } from "react";
import MoodInput from "@/components/MoodInput";
import AyahPlayer from "@/components/AyahPlayer";
import UserPanel from "@/components/UserPanel";
import SignInButton from "@/components/SignInButton";
import AyahOfTheDay from "@/components/AyahOfTheDay";
import ReadingPlanCard from "@/components/ReadingPlanCard";
import type { SearchResponse } from "@/lib/types";
import { speak } from "@/lib/speech";
import { surahName } from "@/lib/quranMeta";
import { resolveSurahQuery } from "@/lib/surahQuery";
import { storage } from "@/lib/storage";

export default function Home() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleMood(mood: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    void speak("One moment. I'm listening to the Qur'an for you.", { rate: 0.95 });
    try {
      // Direct surah lookup — "36", "Yasin", "Al-Ikhlas", "the cave"…
      // Skip the dua/semantic path entirely and load the whole surah.
      const directSurah = resolveSurahQuery(mood);
      if (directSurah) {
        const r = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mood }),
        });
        const data = (await r.json()) as SearchResponse | { error: string };
        if (r.ok && !("error" in data)) {
          setResult(data);
          void speak(
            `Playing Sūrah ${directSurah}, ${surahName(directSurah)}.`,
            { rate: 0.95 },
          );
        } else {
          setError("error" in data ? data.error : "Couldn't load that surah.");
        }
        return;
      }

      // First try the curated du'ā catalog — if there's a confident match,
      // that's almost always the most authentic answer.
      const duaR = await fetch("/api/dua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: mood }),
      });
      const duaData = (await duaR.json()) as SearchResponse | { error: string };
      if (duaR.ok && !("error" in duaData) && duaData.ayahs.length > 0) {
        setResult(duaData);
        const top = duaData.duas?.[0];
        void speak(
          top
            ? `I found a fitting prayer: ${top.title}. ${top.context}`
            : `Found ${duaData.ayahs.length} verses for you.`,
          { rate: 0.95 },
        );
        return;
      }

      // Fall back to semantic mood search.
      const r = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood }),
      });
      const data = (await r.json()) as SearchResponse | { error: string };
      if (!r.ok || "error" in data) {
        const msg = "error" in data ? data.error : `HTTP ${r.status}`;
        setError(msg);
        void speak("Sorry, I couldn't find ayahs right now. Please try again.");
        return;
      }
      if (data.ayahs.length === 0) {
        setError("No ayahs returned. Try a different way of describing what's on your mind.");
        return;
      }
      setResult(data);
      const passages = data.passages?.length ?? 0;
      void speak(
        passages > 0
          ? `Found ${passages} passage${passages === 1 ? "" : "s"}, ${data.ayahs.length} ayahs in all. Press play when you're ready.`
          : `Found ${data.ayahs.length} ayahs that may speak to your heart.`,
        { rate: 0.95 },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleDuaById(id: string) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/dua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await r.json()) as SearchResponse | { error: string };
      if (!r.ok || "error" in data) {
        setError("error" in data ? data.error : `HTTP ${r.status}`);
        return;
      }
      setResult(data);
      const top = data.duas?.[0];
      if (top) void speak(`${top.title}. ${top.context}`, { rate: 0.95 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSurprise() {
    setBusy(true);
    setError(null);
    setResult(null);
    void speak("Let me choose something for you.", { rate: 0.95 });
    try {
      const r = await fetch("/api/random", { method: "POST" });
      const data = (await r.json()) as SearchResponse | { error: string };
      if (!r.ok || "error" in data) {
        setError("error" in data ? data.error : `HTTP ${r.status}`);
        return;
      }
      if (data.ayahs.length === 0) {
        setError("Couldn't load a random surah. Please try again.");
        return;
      }
      setResult(data);
      const surah = data.passages?.[0]?.surah;
      void speak(
        surah ? `Playing Sūrah ${surahName(surah)}.` : "Playing your selection.",
        { rate: 0.95 },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function closePlayer() {
    // If the user just finished today's reading-plan juzʾ, credit it.
    if (result?.source === "plan") {
      storage.markPlanDayComplete();
    }
    setResult(null);
    setRefreshKey((k) => k + 1);
  }

  return (
    <main
      id="main"
      className="hero-glow flex-1 flex flex-col items-center px-4 py-10 sm:py-16 gap-12"
    >
      <div className="w-full max-w-5xl flex justify-end">
        <SignInButton onChange={() => setRefreshKey((k) => k + 1)} />
      </div>
      <header className="text-center">
        <h1 className="text-5xl sm:text-6xl font-serif text-amber-200 tracking-wide">
          Sakīnah
        </h1>
        <p className="mt-2 text-slate-400 text-sm sm:text-base max-w-md mx-auto">
          Tranquillity. Tell us what&apos;s on your mind &mdash; the Qur&apos;an will speak to you.
        </p>
      </header>

      {!result && (
        <>
          <MoodInput
            onSubmit={handleMood}
            onSurprise={handleSurprise}
            onDuaSelect={handleDuaById}
            busy={busy}
          />
          <ReadingPlanCard
            onPlay={(data) => setResult(data)}
            refreshKey={refreshKey}
          />
          <AyahOfTheDay onPlay={(data) => setResult(data)} />
          {error && (
            <p
              role="alert"
              className="text-rose-300 bg-rose-950/40 border border-rose-900 px-4 py-2 rounded-lg max-w-md text-center"
            >
              {error}
            </p>
          )}
        </>
      )}

      {result && (
        <AyahPlayer
          ayahs={result.ayahs}
          mood={result.query}
          passages={result.passages}
          duas={result.duas}
          citations={result.citations}
          onClose={closePlayer}
        />
      )}

      <UserPanel refreshKey={refreshKey} onPlayCollection={handleMood} />

      <footer className="mt-auto pt-12 text-xs text-slate-600 text-center max-w-xl">
        <a
          href="/docs"
          className="text-slate-400 underline underline-offset-4 hover:text-amber-200"
        >
          How it works →
        </a>
        <span className="mx-2 text-slate-700">·</span>
        Built for the Quran Foundation Hackathon 2026 · Powered by{" "}
        <a
          href="https://mcp.quran.ai"
          className="underline hover:text-slate-400"
          target="_blank"
          rel="noreferrer"
        >
          mcp.quran.ai
        </a>{" "}
        and the Quran.com audio CDN.
      </footer>
    </main>
  );
}

