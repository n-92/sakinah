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
