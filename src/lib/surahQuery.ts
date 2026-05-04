import { SURAH_NAMES, SURAH_LENGTHS } from "./quranMeta";

/**
 * Strip diacritics, "al-" prefixes, punctuation and whitespace,
 * and lowercase. Used both to normalise the user's query and the
 * canonical surah names so a wide range of romanisations match.
 */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ʿʾ'`’]/g, "")
    .toLowerCase()
    .replace(/^\s*(al|an|ar|as|ash|at|ad|adh|az|aṣ)[\s-]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Common alternative spellings → canonical surah number. */
const ALIASES: Record<string, number> = {
  fatiha: 1,
  fatihah: 1,
  baqara: 2,
  baqarah: 2,
  imran: 3,
  alimran: 3,
  nisa: 4,
  nisaa: 4,
  maida: 5,
  maidah: 5,
  anam: 6,
  araf: 7,
  aaraf: 7,
  anfal: 8,
  tawba: 9,
  tawbah: 9,
  tauba: 9,
  yunus: 10,
  hud: 11,
  yusuf: 12,
  joseph: 12,
  rad: 13,
  raad: 13,
  ibrahim: 14,
  abraham: 14,
  hijr: 15,
  nahl: 16,
  isra: 17,
  israa: 17,
  bani: 17,
  baniisrail: 17,
  kahf: 18,
  kahaf: 18,
  cave: 18,
  maryam: 19,
  mary: 19,
  taha: 20,
  anbiya: 21,
  hajj: 22,
  muminun: 23,
  nur: 24,
  noor: 24,
  furqan: 25,
  shuara: 26,
  naml: 27,
  qasas: 28,
  ankabut: 29,
  rum: 30,
  luqman: 31,
  sajdah: 32,
  sajda: 32,
  ahzab: 33,
  saba: 34,
  fatir: 35,
  yasin: 36,
  yaseen: 36,
  yaasin: 36,
  saffat: 37,
  sad: 38,
  zumar: 39,
  ghafir: 40,
  mumin: 40,
  fussilat: 41,
  shura: 42,
  zukhruf: 43,
  dukhan: 44,
  jathiyah: 45,
  jathiya: 45,
  ahqaf: 46,
  muhammad: 47,
  fath: 48,
  hujurat: 49,
  qaf: 50,
  dhariyat: 51,
  zariyat: 51,
  tur: 52,
  najm: 53,
  qamar: 54,
  rahman: 55,
  rehman: 55,
  waqia: 56,
  waqiah: 56,
  hadid: 57,
  mujadilah: 58,
  hashr: 59,
  mumtahanah: 60,
  saff: 61,
  jumuah: 62,
  jumua: 62,
  munafiqun: 63,
  taghabun: 64,
  talaq: 65,
  tahrim: 66,
  mulk: 67,
  qalam: 68,
  haqqah: 69,
  maarij: 70,
  nuh: 71,
  noah: 71,
  jinn: 72,
  muzzammil: 73,
  muddaththir: 74,
  muddathir: 74,
  qiyamah: 75,
  insan: 76,
  dahr: 76,
  mursalat: 77,
  naba: 78,
  naziat: 79,
  abasa: 80,
  takwir: 81,
  infitar: 82,
  mutaffifin: 83,
  inshiqaq: 84,
  buruj: 85,
  tariq: 86,
  ala: 87,
  aala: 87,
  ghashiyah: 88,
  fajr: 89,
  balad: 90,
  shams: 91,
  layl: 92,
  duha: 93,
  sharh: 94,
  inshirah: 94,
  tin: 95,
  alaq: 96,
  qadr: 97,
  bayyinah: 98,
  zalzalah: 99,
  zilzal: 99,
  adiyat: 100,
  qariah: 101,
  takathur: 102,
  asr: 103,
  humazah: 104,
  fil: 105,
  quraysh: 106,
  quraish: 106,
  maun: 107,
  kawthar: 108,
  kafirun: 109,
  nasr: 110,
  masad: 111,
  lahab: 111,
  ikhlas: 112,
  ikhlaas: 112,
  falaq: 113,
  nas: 114,
  naas: 114,
};

let nameLookup: Map<string, number> | null = null;
function buildNameLookup(): Map<string, number> {
  if (nameLookup) return nameLookup;
  const map = new Map<string, number>();
  for (let i = 1; i < SURAH_NAMES.length; i += 1) {
    const norm = normalize(SURAH_NAMES[i]);
    if (norm) map.set(norm, i);
  }
  for (const [k, v] of Object.entries(ALIASES)) map.set(k, v);
  nameLookup = map;
  return map;
}

/**
 * Try to interpret the user's input as "play surah N".
 * Returns the surah number (1-114) or null.
 *
 * Recognised:
 *   - bare numbers: "36", "112"
 *   - prefixed: "surah 36", "sura 36", "chapter 36", "s. 36", "#36"
 *   - names: "yasin", "Ya-Sin", "Al-Ikhlās", "the cave", "Yūsuf"
 *   - name with surah prefix: "surah yasin", "sura al-ikhlas"
 */
export function resolveSurahQuery(input: string): number | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Bare number.
  const numOnly = trimmed.match(/^#?\s*(\d{1,3})\s*$/);
  if (numOnly) {
    const n = Number(numOnly[1]);
    return n >= 1 && n <= 114 ? n : null;
  }

  // "surah/sura/chapter/s. <number>"
  const prefixedNum = trimmed.match(
    /^(?:surah?|chapter|ch\.?|s\.?|#)\s*(\d{1,3})\s*$/i,
  );
  if (prefixedNum) {
    const n = Number(prefixedNum[1]);
    return n >= 1 && n <= 114 ? n : null;
  }

  // Strip a leading "surah/sura/chapter" so "surah yasin" → "yasin".
  const stripped = trimmed.replace(
    /^(?:surah?|chapter|ch\.?)\s+/i,
    "",
  );

  const lookup = buildNameLookup();
  const norm = normalize(stripped);
  if (norm && lookup.has(norm)) return lookup.get(norm)!;

  // Final fallback — also check the original (in case of "the cave").
  const norm2 = normalize(trimmed);
  if (norm2 && lookup.has(norm2)) return lookup.get(norm2)!;

  return null;
}

/** Maximum ayahs to load for a "play this surah" request. The longest
 *  surah is Al-Baqarah at 286 — we play the whole thing. */
export const SURAH_PLAY_CAP = 286;

/** Given a surah number, return the start..end ayah window that we'll play. */
export function surahPlayWindow(surah: number): { start: number; end: number } {
  const len = SURAH_LENGTHS[surah] ?? 0;
  return { start: 1, end: Math.min(len, SURAH_PLAY_CAP) };
}
