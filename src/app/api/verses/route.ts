import { NextResponse } from "next/server";
import { fetchQuran, fetchTranslation } from "@/lib/mcp";
import type { Ayah } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARABIC_EDITION = "ar-simple-clean";
const ENGLISH_EDITION = "en-sahih-international";

type FetchResp = { results?: Record<string, Array<{ ayah: string; text: string }>> };

function stripHtml(s: string): string {
  return s
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rangeFor(key: string): string | null {
  const m = key.match(/^(\d+):(\d+)$/);
  if (!m) return null;
  return `${m[1]}:${m[2]}-${m[1]}:${m[2]}`;
}

/**
 * GET /api/verses?keys=2:255,3:8,94:5
 * Returns Ayah[] (arabic + Sahih International translation) for each key.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const keysRaw = url.searchParams.get("keys") ?? "";
    const keys = keysRaw
      .split(",")
      .map((k) => k.trim())
      .filter((k) => /^\d+:\d+$/.test(k));
    if (keys.length === 0) {
      return NextResponse.json({ ok: false, error: "keys required" }, { status: 400 });
    }
    if (keys.length > 50) {
      return NextResponse.json({ ok: false, error: "max 50 keys per request" }, { status: 400 });
    }

    const ranges = keys.map(rangeFor).filter(Boolean).join(",");
    const [arabicData, englishData] = (await Promise.all([
      fetchQuran({ ayahs: ranges, editions: ARABIC_EDITION }),
      fetchTranslation({ ayahs: ranges, editions: ENGLISH_EDITION }),
    ])) as [FetchResp, FetchResp];

    const arMap = new Map<string, string>();
    for (const e of arabicData.results?.[ARABIC_EDITION] ?? []) arMap.set(e.ayah, e.text);
    const enMap = new Map<string, string>();
    for (const e of englishData.results?.[ENGLISH_EDITION] ?? []) {
      enMap.set(e.ayah, stripHtml(e.text));
    }

    const ayahs: Ayah[] = keys.map((key) => {
      const [s, a] = key.split(":").map(Number);
      const ar = arMap.get(key) ?? "";
      const en = enMap.get(key) ?? "";
      return {
        ayah_key: key,
        surah: s,
        ayah: a,
        arabic: ar,
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
        url: `https://quran.com/${s}/${a}`,
      };
    });

    return NextResponse.json(
      { ok: true, ayahs },
      { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }
}
