import { NextResponse } from "next/server";
import { fetchQuran, fetchTranslation } from "@/lib/mcp";
import { matchDuas } from "@/lib/duaMatch";
import { DUAS } from "@/lib/duas";
import type { Ayah, DuaMeta, Passage, SearchResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARABIC_EDITION = "ar-simple-clean";
const ENGLISH_EDITION = "en-sahih-international";

type FetchResp = {
  results?: Record<string, Array<{ ayah: string; text: string }>>;
};

function stripHtml(s: string): string {
  return s
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAyahs(
  passages: Passage[],
  arabic: FetchResp,
  english: FetchResp,
): Ayah[] {
  const arMap = new Map<string, string>();
  for (const e of arabic.results?.[ARABIC_EDITION] ?? []) arMap.set(e.ayah, e.text);
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
          ? [{
              edition_id: ENGLISH_EDITION,
              edition_name: "Sahih International",
              language: "en",
              text: en,
            }]
          : [],
        url: `https://quran.com/${p.surah}/${n}`,
      });
    }
  }
  return out;
}

export async function POST(req: Request) {
  let body: { intent?: string; id?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const passages: Passage[] = [];
  const duas: DuaMeta[] = [];
  let query = "";

  if (body.id) {
    const entry = DUAS.find((d) => d.id === body.id);
    if (!entry) {
      return NextResponse.json({ error: `No du'ā with id '${body.id}'.` }, { status: 404 });
    }
    passages.push({ surah: entry.surah, start: entry.start, end: entry.end });
    duas.push({
      id: entry.id,
      category: entry.category,
      title: entry.title,
      context: entry.context,
      hadith: entry.hadith,
      reciter: entry.reciter,
    });
    query = entry.title;
  } else {
    const intent = (body.intent ?? "").trim();
    if (!intent) {
      return NextResponse.json(
        { error: "Provide an `intent` string or a du'ā `id`." },
        { status: 400 },
      );
    }
    query = intent;
    const matches = matchDuas(intent, { topN: 3, minScore: 2.5 });
    if (matches.length === 0) {
      return NextResponse.json({
        query,
        ayahs: [],
        passages: [],
        duas: [],
        total: 0,
        source: "dua",
      } satisfies SearchResponse);
    }
    for (const m of matches) {
      passages.push({ surah: m.entry.surah, start: m.entry.start, end: m.entry.end });
      duas.push({
        id: m.entry.id,
        category: m.entry.category,
        title: m.entry.title,
        context: m.entry.context,
        hadith: m.entry.hadith,
        reciter: m.entry.reciter,
        matchedOn: m.matchedOn,
      });
    }
  }

  const ranges = passages.map((p) => `${p.surah}:${p.start}-${p.end}`).join(", ");
  try {
    const [arabicData, englishData] = (await Promise.all([
      fetchQuran({ ayahs: ranges, editions: ARABIC_EDITION }),
      fetchTranslation({ ayahs: ranges, editions: ENGLISH_EDITION }),
    ])) as [FetchResp, FetchResp];
    const ayahs = buildAyahs(passages, arabicData, englishData);

    return NextResponse.json(
      {
        query,
        ayahs,
        passages,
        duas,
        total: ayahs.length,
        source: "dua",
        citations: [
          `fetch_quran(${ranges}, ${ARABIC_EDITION})`,
          `fetch_translation(${ranges}, ${ENGLISH_EDITION})`,
        ],
      } satisfies SearchResponse,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({
    duas: DUAS.map((d) => ({
      id: d.id,
      category: d.category,
      title: d.title,
      surah: d.surah,
      start: d.start,
      end: d.end,
      context: d.context,
    })),
    total: DUAS.length,
  });
}
