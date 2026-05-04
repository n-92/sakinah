import { NextResponse } from "next/server";
import { fetchQuran, fetchTranslation } from "@/lib/mcp";
import type { Ayah, SearchResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARABIC_EDITION = "ar-simple-clean";
const ENGLISH_EDITION = "en-sahih-international";

// A curated rotation of short, reflective ayahs that work well as a single
// daily reminder. Each entry is a verse range "surah:start-end".
const ROTATION: string[] = [
  "1:1-7",        // Al-Fatihah
  "2:255-255",    // Ayat al-Kursi
  "13:28-28",     // hearts find rest in remembrance
  "94:5-8",       // with hardship comes ease
  "65:2-3",       // Allah is sufficient
  "39:53-53",     // do not despair of mercy
  "2:286-286",    // Allah does not burden a soul beyond capacity
  "29:69-69",     // those who strive in Us
  "55:13-13",     // which favours of your Lord
  "67:1-2",       // blessed is He
  "93:1-11",      // Surah Ad-Duha
  "103:1-3",      // Surah Al-Asr
  "112:1-4",      // Surah Al-Ikhlas
  "94:1-8",       // Surah Ash-Sharh
  "99:1-8",       // Surah Az-Zalzalah
];

function stripHtml(s: string): string {
  return s
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type FetchResp = { results?: Record<string, Array<{ ayah: string; text: string }>> };

function todayIndex(): { idx: number; date: string } {
  const now = new Date();
  // Days since 2024-01-01 — stable, deterministic per UTC day.
  const epoch = Date.UTC(2024, 0, 1);
  const days = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - epoch) / 86_400_000);
  const idx = ((days % ROTATION.length) + ROTATION.length) % ROTATION.length;
  const date = now.toISOString().slice(0, 10);
  return { idx, date };
}

export async function GET() {
  try {
    const { idx, date } = todayIndex();
    const range = ROTATION[idx];
    const m = range.match(/^(\d+):(\d+)-(\d+)$/);
    if (!m) throw new Error("Bad rotation entry");
    const surah = Number(m[1]);
    const start = Number(m[2]);
    const end = Number(m[3]);

    const [arabicData, englishData] = (await Promise.all([
      fetchQuran({ ayahs: range, editions: ARABIC_EDITION }),
      fetchTranslation({ ayahs: range, editions: ENGLISH_EDITION }),
    ])) as [FetchResp, FetchResp];

    const arMap = new Map<string, string>();
    for (const e of arabicData.results?.[ARABIC_EDITION] ?? []) arMap.set(e.ayah, e.text);
    const enMap = new Map<string, string>();
    for (const e of englishData.results?.[ENGLISH_EDITION] ?? []) {
      enMap.set(e.ayah, stripHtml(e.text));
    }

    const ayahs: Ayah[] = [];
    for (let n = start; n <= end; n++) {
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

    const payload: SearchResponse & { date: string } = {
      query: "Ayah of the day",
      ayahs,
      passages: [{ surah, start, end }],
      source: "ayah_of_the_day",
      total: ayahs.length,
      citations: [
        `fetch_quran(${range}, ${ARABIC_EDITION})`,
        `fetch_translation(${range}, ${ENGLISH_EDITION})`,
      ],
      date,
    };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
