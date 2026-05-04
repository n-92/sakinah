"use client";

import { useEffect, useState } from "react";
import type { SearchResponse } from "@/lib/types";
import { storage, type ReadingPlan } from "@/lib/storage";
import { juzLabel, juzAyahCount } from "@/lib/quranMeta";

const TOTAL_DAYS = 30; // khatm-30: one juzʾ per day

export default function ReadingPlanCard({
  onPlay,
  refreshKey,
}: {
  onPlay: (data: SearchResponse) => void;
  refreshKey: number;
}) {
  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPlan(storage.getPlan());
    setHydrated(true);
  }, [refreshKey]);

  if (!hydrated) return null;

  const today = new Date().toISOString().slice(0, 10);
  const completed = plan?.completed_days.length ?? 0;
  const todayDone = !!plan?.completed_days.includes(today);
  const currentJuz = Math.min(completed + 1, TOTAL_DAYS);
  const finished = plan && completed >= TOTAL_DAYS;

  async function start(): Promise<void> {
    const next = storage.startPlan("khatm-30");
    setPlan(next);
  }

  function cancel(): void {
    if (!confirm("End the reading plan? Your progress will be cleared.")) return;
    storage.cancelPlan();
    setPlan(null);
  }

  async function loadToday(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/reading-plan?juz=${currentJuz}`, {
        cache: "force-cache",
      });
      const data = (await r.json()) as SearchResponse | { error: string };
      if (!r.ok || "error" in data) {
        setError("error" in data ? data.error : `HTTP ${r.status}`);
        return;
      }
      onPlay(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  function markComplete(): void {
    const next = storage.markPlanDayComplete();
    if (next) setPlan(next);
  }

  // No plan — show start CTA
  if (!plan) {
    return (
      <section
        aria-label="Reading plan"
        className="w-full max-w-3xl rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] to-slate-500/[0.04] p-6 sm:p-8"
      >
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-emerald-300/80 mb-3">
          <span>✦ Daily reading plan</span>
          <span className="text-slate-500 normal-case tracking-normal">30-day khatm</span>
        </div>
        <h2 className="text-2xl font-serif text-emerald-100 mb-2">
          Read the Qurʾān in 30 days
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-5">
          One juzʾ each day, in order. Each session feeds your Qurʾān Foundation
          streak so progress follows you across devices.
        </p>
        <button
          type="button"
          onClick={start}
          className="rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 px-5 py-2 text-sm text-emerald-100 focus-visible:outline-emerald-300"
        >
          Start the plan
        </button>
      </section>
    );
  }

  if (finished) {
    return (
      <section
        aria-label="Reading plan complete"
        className="w-full max-w-3xl rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.10] to-emerald-500/[0.06] p-6 sm:p-8"
      >
        <div className="text-xs uppercase tracking-[0.25em] text-amber-300/90 mb-3">
          ✦ Khatm complete
        </div>
        <h2 className="text-2xl font-serif text-amber-100 mb-2">
          May Allah accept it from you.
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-5">
          You finished a full reading of the Qurʾān across {plan.completed_days.length} sessions.
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              storage.cancelPlan();
              setPlan(null);
            }}
            className="rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 px-5 py-2 text-sm text-amber-100"
          >
            Begin a new khatm
          </button>
        </div>
      </section>
    );
  }

  const percent = Math.round((completed / TOTAL_DAYS) * 100);
  const ayahCount = juzAyahCount(currentJuz);

  return (
    <section
      aria-label="Reading plan"
      className="w-full max-w-3xl rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] to-slate-500/[0.04] p-6 sm:p-8"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-emerald-300/80 mb-3">
        <span>✦ Today&apos;s reading</span>
        <span className="text-slate-500 normal-case tracking-normal">
          Day {Math.min(completed + (todayDone ? 0 : 1), TOTAL_DAYS)} of {TOTAL_DAYS}
        </span>
      </div>

      <h2 className="text-2xl font-serif text-emerald-100 mb-1">
        Juzʾ {currentJuz}
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        {juzLabel(currentJuz)} · {ayahCount} ayahs
      </p>

      <div
        className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mb-5"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percent} percent complete`}
      >
        <div
          className="h-full bg-emerald-400/70 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || todayDone}
          onClick={loadToday}
          className="rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 px-5 py-2 text-sm text-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-emerald-300"
        >
          {busy ? "Loading…" : todayDone ? "Done for today ✓" : `▶ Read Juzʾ ${currentJuz}`}
        </button>
        {!todayDone && (
          <button
            type="button"
            onClick={markComplete}
            className="rounded-full border border-slate-700 hover:border-slate-500 px-4 py-2 text-sm text-slate-300"
            title="Mark today's reading complete without playing"
          >
            Mark complete
          </button>
        )}
        <button
          type="button"
          onClick={cancel}
          className="ml-auto text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4"
        >
          End plan
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}
