import { NextResponse } from "next/server";
import { fetchPassageAyahs, passageRangeCitation } from "@/lib/fetchAyahs";
import { juzToPassages, juzLabel, surahName } from "@/lib/quranMeta";
import type { Passage, SearchResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const juz = Number(url.searchParams.get("juz"));
  if (!Number.isInteger(juz) || juz < 1 || juz > 30) {
    return NextResponse.json(
      { error: "Provide ?juz=N where N is 1..30." },
      { status: 400 },
    );
  }

  const segs = juzToPassages(juz);
  const passages: Passage[] = segs.map((s) => ({
    surah: s.surah,
    start: s.start,
    end: s.end,
    reason: `Juzʾ ${juz} · ${surahName(s.surah)} ${s.start}–${s.end}`,
  }));
  const ranges = passageRangeCitation(passages);

  try {
    const ayahs = await fetchPassageAyahs(passages);

    const resp: SearchResponse = {
      query: `Juzʾ ${juz}`,
      ayahs,
      passages,
      total: ayahs.length,
      source: "plan",
      notice: `Juzʾ ${juz} · ${juzLabel(juz)}`,
      citations: [
        `reading_plan(juz=${juz})`,
        `fetch_quran(${ranges}, ar-simple-clean)`,
        `fetch_translation(${ranges}, en-sahih-international)`,
      ],
    };
    return NextResponse.json(resp, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load juzʾ";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
