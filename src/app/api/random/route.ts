import { NextResponse } from "next/server";
import { fetchQuran, fetchTranslation } from "@/lib/mcp";
import { surahLength } from "@/lib/quranMeta";
import type { Ayah, SearchResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARABIC_EDITION = "ar-simple-clean";
const ENGLISH_EDITION = "en-sahih-international";

// A curated pool that errs toward shorter, contemplative surahs so a "random
// listen" is digestible. Al-Fatiha plus most short Meccan surahs.
const POOL: number[] = [
  1, 36, 55, 67, 78, 87, 89, 91, 92, 93, 94, 97, 99, 102, 103, 105, 106,
  107, 108, 109, 110, 111, 112, 113, 114,
];

function stripHtml(s: string): string {
  return s
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type FetchResp = {
  results?: Record<string, Array<{ ayah: string; text: string }>>;
};

export async function POST() {
  try {
    const surah = POOL[Math.floor(Math.random() * POOL.length)];
    const len = surahLength(surah);
    const end = Math.min(len, 12);
    const range = `${surah}:1-${end}`;

    const [arabicData, englishData] = (await Promise.all([
      fetchQuran({ ayahs: range, editions: ARABIC_EDITION }),
      fetchTranslation({ ayahs: range, editions: ENGLISH_EDITION }),
    ])) as [FetchResp, FetchResp];

    const arMap = new Map<string, string>();
    for (const e of arabicData.results?.[ARABIC_EDITION] ?? []) {
      arMap.set(e.ayah, e.text);
    }
    const enMap = new Map<string, string>();
    for (const e of englishData.results?.[ENGLISH_EDITION] ?? []) {
      enMap.set(e.ayah, stripHtml(e.text));
    }

    const ayahs: Ayah[] = [];
    for (let n = 1; n <= end; n++) {
      const key = `${surah}:${n}`;
      const ar = arMap.get(key);
      const en = enMap.get(key);
      if (!ar && !en) continue;
      ayahs.push({
        ayah_key: key,
        surah,
        ayah: n,
        arabic: ar ?? "",
        translations: en
          ? [
              {
                edition_id: ENGLISH_EDITION,
                edition_name: "Sahih International",
                language: "en",
                text: en,
              },
            ]
          : [],
        url: `https://quran.com/${surah}/${n}`,
      });
    }

    const payload: SearchResponse = {
      query: `Sūrah ${surah}`,
      ayahs,
      passages: [{ surah, start: 1, end }],
      total: ayahs.length,
    };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
