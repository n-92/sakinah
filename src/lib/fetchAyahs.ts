/**
 * Fetch Arabic + English text for a list of passages, chunking the
 * upstream MCP calls to stay under fetch_quran's per-call limit
 * (empirically ~80 ayahs per call — we chunk at 50 for safety).
 */
import { fetchQuran, fetchTranslation } from "./mcp";
import type { Ayah, Passage } from "./types";

const ARABIC_EDITION = "ar-simple-clean";
const ENGLISH_EDITION = "en-sahih-international";

const FETCH_CHUNK = 50;

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

function passagesToRangeString(passages: Passage[]): string {
  return passages.map((p) => `${p.surah}:${p.start}-${p.end}`).join(", ");
}

function buildAyahs(
  passages: Passage[],
  arabic: FetchResp,
  english: FetchResp,
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
                edition_name: "Sahih International",
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

function chunkPassages(passages: Passage[]): Passage[][] {
  const chunks: Passage[][] = [];
  let cur: Passage[] = [];
  let count = 0;
  const flush = (): void => {
    if (cur.length) {
      chunks.push(cur);
      cur = [];
      count = 0;
    }
  };
  for (const p of passages) {
    let s = p.start;
    while (s <= p.end) {
      const remaining = p.end - s + 1;
      const room = FETCH_CHUNK - count;
      const take = Math.min(remaining, room);
      cur.push({ ...p, start: s, end: s + take - 1 });
      count += take;
      s += take;
      if (count >= FETCH_CHUNK) flush();
    }
  }
  flush();
  return chunks;
}

/**
 * Fetch Arabic + English ayahs for the given passages. Chunks upstream
 * calls so long ranges (e.g. all 286 ayahs of Al-Baqarah, or a full juzʾ)
 * come back complete.
 */
export async function fetchPassageAyahs(passages: Passage[]): Promise<Ayah[]> {
  const batches = chunkPassages(passages);
  const responses = await Promise.all(
    batches.map(async (batch) => {
      const ranges = passagesToRangeString(batch);
      const [arabicData, englishData] = (await Promise.all([
        fetchQuran({ ayahs: ranges, editions: ARABIC_EDITION }),
        fetchTranslation({ ayahs: ranges, editions: ENGLISH_EDITION }),
      ])) as [FetchResp, FetchResp];
      return buildAyahs(batch, arabicData, englishData);
    }),
  );
  return responses.flat();
}

export function passageRangeCitation(passages: Passage[]): string {
  return passagesToRangeString(passages);
}
