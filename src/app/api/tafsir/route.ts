import { NextResponse } from "next/server";
import { fetchTafsir } from "@/lib/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAFSIR_EDITION = "en-ibn-kathir";

type TafsirResp = {
  results?: Record<
    string,
    Array<{ ayah: string; text: string; from_ayah?: string; to_ayah?: string }>
  >;
};

function stripHtml(s: string): string {
  return s
    .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(p|div|br|h\d|li|ul|ol)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ayah = (url.searchParams.get("ayah") ?? "").trim();
  const edition = (url.searchParams.get("edition") ?? TAFSIR_EDITION).trim();

  if (!ayah || !/^\d+:\d+(-\d+)?$/.test(ayah)) {
    return NextResponse.json(
      { error: "Provide `ayah` like '2:255' or '2:255-257'." },
      { status: 400 },
    );
  }

  try {
    const data = (await fetchTafsir({ ayahs: ayah, editions: edition })) as TafsirResp;
    const entries = data.results?.[edition] ?? [];
    const items = entries.map((e) => ({
      ayah: e.ayah,
      text: stripHtml(e.text),
      from_ayah: e.from_ayah,
      to_ayah: e.to_ayah,
    }));
    return NextResponse.json(
      {
        ayah,
        edition,
        edition_name: "Tafsīr Ibn Kathīr (abridged, English)",
        items,
        citation: `fetch_tafsir(${ayah}, ${edition})`,
      },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
