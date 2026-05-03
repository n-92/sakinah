import { NextResponse } from "next/server";
import { searchQuran, fetchQuran, fetchTranslation } from "@/lib/mcp";
import { surahLength } from "@/lib/quranMeta";
import type { Ayah, Passage, SearchResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARABIC_EDITION = "ar-simple-clean";
const ENGLISH_EDITION = "en-sahih-international";

// Tunables for passage selection.
const MAX_PASSAGES = 3;
const MAX_PASSAGE_LEN = 8; // ayahs per passage
const CONTEXT_PADDING = 1; // expand window ±N for context

type RawHit = {
  ayah_key: string;
  surah: number;
  ayah: number;
  text: string;
  translations?: Array<{ text?: string; edition?: { id?: string; name?: string } }>;
  relevance_score?: number | null;
};
type RawSearch = { query?: string; results?: RawHit[]; total_found?: number };

type FetchResp = {
  results?: Record<string, Array<{ ayah: string; text: string }>>;
};

function stripHtml(s: string): string {
  // Remove footnote sup tags etc. so SpeechSynthesis doesn't read "1" everywhere.
  return s
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAyahKey(key: string): { surah: number; ayah: number } {
  const [s, a] = key.split(":").map(Number);
  return { surah: s, ayah: a };
}

/** Score each surah by aggregate relevance of its hits, then choose contiguous
 *  ayah windows around the strongest hits. */
function pickPassages(hits: RawHit[]): Passage[] {
  const bySurah = new Map<number, RawHit[]>();
  for (const h of hits) {
    if (!bySurah.has(h.surah)) bySurah.set(h.surah, []);
    bySurah.get(h.surah)!.push(h);
  }

  const ranked = [...bySurah.entries()]
    .map(([surah, items]) => {
      const total = items.reduce((s, x) => s + (x.relevance_score ?? 0), 0);
      const top = Math.max(...items.map((x) => x.relevance_score ?? 0));
      // Score combines best-hit strength with corroboration from multiple hits.
      const score = top + 0.25 * (total - top);
      return { surah, items, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PASSAGES);

  const passages: Passage[] = [];
  for (const { surah, items } of ranked) {
    const len = surahLength(surah);
    const ayahNums = items.map((i) => i.ayah).sort((a, b) => a - b);
    let start = ayahNums[0];
    let end = ayahNums[ayahNums.length - 1];

    // If hits span too wide, center on the highest-relevance one.
    if (end - start + 1 > MAX_PASSAGE_LEN) {
      const peak = items.reduce((best, x) =>
        (x.relevance_score ?? 0) > (best.relevance_score ?? 0) ? x : best,
      );
      const half = Math.floor(MAX_PASSAGE_LEN / 2);
      start = peak.ayah - half;
      end = peak.ayah + (MAX_PASSAGE_LEN - half - 1);
    }

    // Add a little context.
    start -= CONTEXT_PADDING;
    end += CONTEXT_PADDING;

    // Clamp to surah bounds.
    start = Math.max(1, start);
    end = len > 0 ? Math.min(len, end) : end;

    // Clip to MAX_PASSAGE_LEN if context-expansion overshot.
    if (end - start + 1 > MAX_PASSAGE_LEN) end = start + MAX_PASSAGE_LEN - 1;

    passages.push({
      surah,
      start,
      end,
      reason: items[0]?.translations?.[0]?.text?.slice(0, 120),
    });
  }
  return passages;
}

function passagesToRangeString(passages: Passage[]): string {
  return passages.map((p) => `${p.surah}:${p.start}-${p.end}`).join(", ");
}

/** Combine Arabic + English fetch results into Ayah[] in surah:ayah order. */
function buildAyahs(
  passages: Passage[],
  arabic: FetchResp,
  english: FetchResp,
  englishEditionName: string,
): Ayah[] {
  const arMap = new Map<string, string>();
  for (const e of arabic.results?.[ARABIC_EDITION] ?? []) {
    arMap.set(e.ayah, e.text);
  }
  const enMap = new Map<string, string>();
  for (const e of english.results?.[ENGLISH_EDITION] ?? []) {
    enMap.set(e.ayah, stripHtml(e.text));
  }

  const out: Ayah[] = [];
  for (const p of passages) {
    for (let n = p.start; n <= p.end; n++) {
      const key = `${p.surah}:${n}`;
      const ar = arMap.get(key);
      const en = enMap.get(key);
      if (!ar && !en) continue;
      out.push({
        ayah_key: key,
        surah: p.surah,
        ayah: n,
        arabic: ar ?? "",
        translations: en
          ? [
              {
                edition_id: ENGLISH_EDITION,
                edition_name: englishEditionName,
                language: "en",
                text: en,
              },
            ]
          : [],
        url: `https://quran.com/${p.surah}/${n}`,
      });
    }
  }
  return out;
}

function shufflePassages(passages: Passage[]): Passage[] {
  const a = [...passages];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: Request) {
  let body: { mood?: string; shuffle?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const mood = (body.mood ?? "").trim();
  if (!mood) {
    return NextResponse.json(
      { error: "Provide a `mood` string describing what's on your mind." },
      { status: 400 },
    );
  }

  try {
    // 1. Semantic search → scattered hits across the Qur'an.
    const raw = (await searchQuran({
      query: mood,
      translations: ENGLISH_EDITION,
    })) as RawSearch | null;
    const hits = raw?.results ?? [];
    if (hits.length === 0) {
      return NextResponse.json({
        query: mood,
        ayahs: [],
        passages: [],
        total: 0,
      } satisfies SearchResponse);
    }

    // 2. Group by surah and pick contiguous passages.
    let passages = pickPassages(hits);
    if (body.shuffle) passages = shufflePassages(passages);

    // 3. Fetch Arabic + English text for the contiguous ranges in parallel.
    const ranges = passagesToRangeString(passages);
    const [arabicData, englishData] = (await Promise.all([
      fetchQuran({ ayahs: ranges, editions: ARABIC_EDITION }),
      fetchTranslation({ ayahs: ranges, editions: ENGLISH_EDITION }),
    ])) as [FetchResp, FetchResp];

    const ayahs = buildAyahs(
      passages,
      arabicData,
      englishData,
      "Sahih International",
    );

    return NextResponse.json(
      {
        query: mood,
        ayahs,
        passages,
        total: hits.length,
      } satisfies SearchResponse,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
