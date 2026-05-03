"use client";

import { useEffect, useMemo, useState } from "react";
import { isVoiceInputSupported, listenOnce } from "@/lib/speech";
import { matchDuas, type DuaMatch } from "@/lib/duaMatch";
import { DUAS, DUA_CATEGORIES, type DuaCategory } from "@/lib/duas";
import { surahName } from "@/lib/quranMeta";

type Props = {
  onSubmit: (mood: string) => void;
  onSurprise?: () => void;
  onDuaSelect?: (id: string) => void;
  busy?: boolean;
};

export default function MoodInput({
  onSubmit,
  onSurprise,
  onDuaSelect,
  busy,
}: Props) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceOk, setVoiceOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<DuaCategory | null>(null);

  useEffect(() => {
    setVoiceOk(isVoiceInputSupported());
  }, []);

  // Live du'ā suggestions as the user types.
  const suggestions: DuaMatch[] = useMemo(() => {
    const q = text.trim();
    if (q.length < 3) return [];
    return matchDuas(q, { topN: 3, minScore: 2.5 });
  }, [text]);

  const browseList = useMemo(
    () => (activeCat ? DUAS.filter((d) => d.category === activeCat) : []),
    [activeCat],
  );

  function submit(value: string) {
    const v = value.trim();
    if (!v || busy) return;
    onSubmit(v);
  }

  function startListening() {
    if (!voiceOk || listening) return;
    setError(null);
    setListening(true);
    listenOnce({
      onResult: (transcript) => {
        setText(transcript);
        submit(transcript);
      },
      onError: (e) => setError(e),
      onEnd: () => setListening(false),
    });
  }

  return (
    <section
      aria-label="What you are thinking"
      className="flex flex-col items-center gap-6 w-full max-w-2xl"
    >
      <h2 className="text-2xl sm:text-3xl font-serif text-center text-slate-100">
        What are you thinking?
      </h2>

      <button
        type="button"
        onClick={startListening}
        disabled={!voiceOk || busy || listening}
        aria-pressed={listening}
        aria-label={
          listening
            ? "Listening — speak now"
            : voiceOk
              ? "Tap and speak what you are thinking"
              : "Voice input not available in this browser"
        }
        className={[
          "group relative w-44 h-44 sm:w-56 sm:h-56 rounded-full",
          "flex items-center justify-center",
          "bg-gradient-to-br from-emerald-500 to-teal-700",
          "shadow-[0_0_60px_rgba(16,185,129,0.35)]",
          "transition-transform focus:outline-none",
          "focus-visible:ring-4 focus-visible:ring-amber-300",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          listening ? "animate-pulse scale-105" : "hover:scale-105",
        ].join(" ")}
      >
        <span className="sr-only">
          {listening ? "Listening" : "Speak what you are thinking"}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="w-20 h-20 sm:w-28 sm:h-28 text-white drop-shadow"
          fill="currentColor"
        >
          <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
          <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 0 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
        </svg>
      </button>

      <p
        aria-live="polite"
        className="text-sm text-slate-400 text-center min-h-[1.25rem]"
      >
        {listening
          ? "Listening… speak when you're ready."
          : voiceOk
            ? "Tap the circle and tell me what's on your mind — or type below."
            : "Type what you're thinking below. Voice input is not supported here."}
      </p>

      <form
        className="flex w-full gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <label htmlFor="mood-text" className="sr-only">
          Describe what you are thinking
        </label>
        <input
          id="mood-text"
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActiveCat(null);
          }}
          placeholder="e.g. I keep worrying about the future"
          disabled={busy}
          autoComplete="off"
          className={[
            "flex-1 px-5 py-4 rounded-2xl text-lg",
            "bg-slate-800/80 text-slate-50 placeholder-slate-500",
            "border border-slate-700",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300",
          ].join(" ")}
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className={[
            "px-6 py-4 rounded-2xl text-lg font-medium",
            "bg-amber-300 text-slate-900",
            "hover:bg-amber-200",
            "focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          {busy ? "Listening to the Qur'an…" : "Find ayahs"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      )}

      {/* Live duʿā suggestions as the user types. */}
      {!busy && suggestions.length > 0 && (
        <section
          aria-label="Suggested duʿās"
          className="w-full flex flex-col gap-2"
        >
          <div className="text-xs uppercase tracking-widest text-emerald-400/80 px-1">
            🤲 Suggested prayers — tap to play
          </div>
          <ul className="flex flex-col gap-2">
            {suggestions.map((m) => (
              <li key={m.entry.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    onDuaSelect ? onDuaSelect(m.entry.id) : submit(text)
                  }
                  className={[
                    "w-full text-left px-4 py-3 rounded-xl",
                    "bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-900/60",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
                  ].join(" ")}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-emerald-100 font-medium">
                      {m.entry.title}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {surahName(m.entry.surah)} {m.entry.start}
                      {m.entry.end !== m.entry.start ? `–${m.entry.end}` : ""}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mt-1 leading-snug line-clamp-2">
                    {m.entry.context}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Empty-input browse: category chips, expand inline. */}
      {!busy && text.trim().length === 0 && (
        <section aria-label="Browse duʿās" className="w-full flex flex-col gap-3">
          <div className="text-xs uppercase tracking-widest text-slate-500 px-1 text-center">
            or browse {DUAS.length} prayers by need
          </div>
          <ul className="flex flex-wrap gap-2 justify-center">
            {DUA_CATEGORIES.map((c) => {
              const count = DUAS.filter((d) => d.category === c.id).length;
              if (count === 0) return null;
              const selected = activeCat === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveCat(selected ? null : c.id)}
                    aria-pressed={selected}
                    className={[
                      "px-3 py-1.5 rounded-full text-sm border",
                      selected
                        ? "bg-amber-300 text-slate-900 border-amber-300"
                        : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
                    ].join(" ")}
                  >
                    <span aria-hidden="true">{c.emoji}</span> {c.title}
                    <span
                      className={[
                        "text-xs ml-1",
                        selected ? "text-slate-700" : "text-slate-500",
                      ].join(" ")}
                    >
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {activeCat && (
            <ul className="flex flex-col gap-2 mt-1">
              {browseList.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDuaSelect?.(d.id)}
                    className={[
                      "w-full text-left px-4 py-3 rounded-xl",
                      "bg-slate-800/70 hover:bg-slate-700 border border-slate-700",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    ].join(" ")}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-slate-100 font-medium">{d.title}</span>
                      <span className="text-xs text-slate-500 shrink-0">
                        {surahName(d.surah)} {d.start}
                        {d.end !== d.start ? `–${d.end}` : ""}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1 leading-snug">
                      {d.context}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {onSurprise && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <div
            aria-hidden="true"
            className="text-xs uppercase tracking-widest text-slate-600"
          >
            or
          </div>
          <button
            type="button"
            onClick={onSurprise}
            disabled={busy}
            aria-label="Play a random short surah"
            className={[
              "px-6 py-3 rounded-full text-base font-medium",
              "bg-slate-800 text-slate-100 border border-slate-700",
              "hover:bg-slate-700",
              "focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            🎲 Surprise me — random surah
          </button>
        </div>
      )}
    </section>
  );
}
