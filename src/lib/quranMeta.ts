// Number of ayahs in each of the 114 surahs (index = surah number, [0] unused).
// Source: standard Hafs codification — fixed metadata, never changes.
export const SURAH_LENGTHS: number[] = [
  0,
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6,
];

export function surahLength(surah: number): number {
  return SURAH_LENGTHS[surah] ?? 0;
}

// Transliterated names of all 114 surahs (index = surah number; [0] unused).
export const SURAH_NAMES: string[] = [
  "",
  "Al-Fātiḥah", "Al-Baqarah", "Āl ʿImrān", "An-Nisāʾ", "Al-Māʾidah",
  "Al-Anʿām", "Al-Aʿrāf", "Al-Anfāl", "At-Tawbah", "Yūnus",
  "Hūd", "Yūsuf", "Ar-Raʿd", "Ibrāhīm", "Al-Ḥijr",
  "An-Naḥl", "Al-Isrāʾ", "Al-Kahf", "Maryam", "Ṭā Hā",
  "Al-Anbiyāʾ", "Al-Ḥajj", "Al-Muʾminūn", "An-Nūr", "Al-Furqān",
  "Ash-Shuʿarāʾ", "An-Naml", "Al-Qaṣaṣ", "Al-ʿAnkabūt", "Ar-Rūm",
  "Luqmān", "As-Sajdah", "Al-Aḥzāb", "Sabaʾ", "Fāṭir",
  "Yā Sīn", "Aṣ-Ṣāffāt", "Ṣād", "Az-Zumar", "Ghāfir",
  "Fuṣṣilat", "Ash-Shūrā", "Az-Zukhruf", "Ad-Dukhān", "Al-Jāthiyah",
  "Al-Aḥqāf", "Muḥammad", "Al-Fatḥ", "Al-Ḥujurāt", "Qāf",
  "Adh-Dhāriyāt", "Aṭ-Ṭūr", "An-Najm", "Al-Qamar", "Ar-Raḥmān",
  "Al-Wāqiʿah", "Al-Ḥadīd", "Al-Mujādilah", "Al-Ḥashr", "Al-Mumtaḥanah",
  "Aṣ-Ṣaff", "Al-Jumuʿah", "Al-Munāfiqūn", "At-Taghābun", "Aṭ-Ṭalāq",
  "At-Taḥrīm", "Al-Mulk", "Al-Qalam", "Al-Ḥāqqah", "Al-Maʿārij",
  "Nūḥ", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyāmah",
  "Al-Insān", "Al-Mursalāt", "An-Nabaʾ", "An-Nāziʿāt", "ʿAbasa",
  "At-Takwīr", "Al-Infiṭār", "Al-Muṭaffifīn", "Al-Inshiqāq", "Al-Burūj",
  "Aṭ-Ṭāriq", "Al-Aʿlā", "Al-Ghāshiyah", "Al-Fajr", "Al-Balad",
  "Ash-Shams", "Al-Layl", "Aḍ-Ḍuḥā", "Ash-Sharḥ", "At-Tīn",
  "Al-ʿAlaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-ʿĀdiyāt",
  "Al-Qāriʿah", "At-Takāthur", "Al-ʿAṣr", "Al-Humazah", "Al-Fīl",
  "Quraysh", "Al-Māʿūn", "Al-Kawthar", "Al-Kāfirūn", "An-Naṣr",
  "Al-Masad", "Al-Ikhlāṣ", "Al-Falaq", "An-Nās",
];

export function surahName(surah: number): string {
  return SURAH_NAMES[surah] ?? `Sūrah ${surah}`;
}

// Start of each juz' as { surah, ayah } in mushaf order.
// Index 1..30; index 0 unused. The end of a juz' is one ayah before the
// start of the next; juz' 30 ends at 114:6 (end of the Qur'ān).
// Source: standard Hafs codification.
export const JUZ_STARTS: Array<{ surah: number; ayah: number }> = [
  { surah: 0, ayah: 0 }, // unused
  { surah: 1, ayah: 1 },     // 1
  { surah: 2, ayah: 142 },   // 2
  { surah: 2, ayah: 253 },   // 3
  { surah: 3, ayah: 93 },    // 4
  { surah: 4, ayah: 24 },    // 5
  { surah: 4, ayah: 148 },   // 6
  { surah: 5, ayah: 82 },    // 7
  { surah: 6, ayah: 111 },   // 8
  { surah: 7, ayah: 88 },    // 9
  { surah: 8, ayah: 41 },    // 10
  { surah: 9, ayah: 93 },    // 11
  { surah: 11, ayah: 6 },    // 12
  { surah: 12, ayah: 53 },   // 13
  { surah: 15, ayah: 1 },    // 14
  { surah: 17, ayah: 1 },    // 15
  { surah: 18, ayah: 75 },   // 16
  { surah: 21, ayah: 1 },    // 17
  { surah: 23, ayah: 1 },    // 18
  { surah: 25, ayah: 21 },   // 19
  { surah: 27, ayah: 56 },   // 20
  { surah: 29, ayah: 46 },   // 21
  { surah: 33, ayah: 31 },   // 22
  { surah: 36, ayah: 28 },   // 23
  { surah: 39, ayah: 32 },   // 24
  { surah: 41, ayah: 47 },   // 25
  { surah: 46, ayah: 1 },    // 26
  { surah: 51, ayah: 31 },   // 27
  { surah: 58, ayah: 1 },    // 28
  { surah: 67, ayah: 1 },    // 29
  { surah: 78, ayah: 1 },    // 30
];

/**
 * Expand a juz' (1..30) into a list of contiguous (surah, start, end)
 * passages — typically 1 to ~3 segments, since juz' boundaries cross
 * surah boundaries.
 */
export function juzToPassages(
  juz: number,
): Array<{ surah: number; start: number; end: number }> {
  if (juz < 1 || juz > 30) return [];
  const a = JUZ_STARTS[juz];
  const b = juz === 30
    ? { surah: 114, ayah: SURAH_LENGTHS[114] }
    : JUZ_STARTS[juz + 1];
  const segments: Array<{ surah: number; start: number; end: number }> = [];

  if (a.surah === b.surah) {
    // Whole juz' inside one surah: end one before next juz' start
    // (or at surah end if next juz' starts at a different surah's ayah 1).
    segments.push({ surah: a.surah, start: a.ayah, end: b.ayah - 1 });
    return segments;
  }

  // First segment: from a.ayah to end of a.surah.
  segments.push({
    surah: a.surah,
    start: a.ayah,
    end: SURAH_LENGTHS[a.surah],
  });
  // Whole surahs in between.
  for (let s = a.surah + 1; s < b.surah; s += 1) {
    segments.push({ surah: s, start: 1, end: SURAH_LENGTHS[s] });
  }
  // Last segment: from ayah 1 of b.surah to b.ayah - 1
  // (special case for juz' 30: include the final ayah).
  const lastEnd = juz === 30 ? b.ayah : b.ayah - 1;
  if (lastEnd >= 1) {
    segments.push({ surah: b.surah, start: 1, end: lastEnd });
  }
  return segments;
}

/** Total ayahs in a juz' — useful for progress bars and previews. */
export function juzAyahCount(juz: number): number {
  return juzToPassages(juz).reduce((n, p) => n + (p.end - p.start + 1), 0);
}

/** Pretty range label, e.g. "Al-Baqarah 142 – 252". */
export function juzLabel(juz: number): string {
  const segs = juzToPassages(juz);
  if (segs.length === 0) return `Juzʾ ${juz}`;
  const first = segs[0];
  const last = segs[segs.length - 1];
  if (segs.length === 1) {
    return `${surahName(first.surah)} ${first.start}–${first.end}`;
  }
  return `${surahName(first.surah)} ${first.start} → ${surahName(last.surah)} ${last.end}`;
}
