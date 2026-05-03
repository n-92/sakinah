/**
 * Audio URL helpers.
 *
 * EveryAyah hosts per-ayah Arabic recitation MP3s with the URL pattern
 * `https://everyayah.com/data/{folder}/{SSSAAA}.mp3`, where S is the
 * 3-digit zero-padded surah and A is the 3-digit zero-padded ayah.
 *
 * Default reciter is Mishary Al-Afasy. Selectable in the UI.
 */

export type Reciter = {
  id: string;
  name: string;
  /** EveryAyah folder name */
  folder: string;
};

export const RECITERS: Reciter[] = [
  { id: "alafasy", name: "Mishary Al-Afasy", folder: "Alafasy_128kbps" },
  { id: "abdulbasit", name: "Abdul Basit (Murattal)", folder: "AbdulSamad_64kbps_QuranExplorer.Com" },
  { id: "husary", name: "Mahmoud Khalil Al-Husary", folder: "Husary_128kbps" },
  { id: "minshawi", name: "Mohamed Siddiq Al-Minshawi", folder: "Minshawy_Murattal_128kbps" },
  { id: "sudais", name: "Abdur-Rahman As-Sudais", folder: "Abdurrahmaan_As-Sudais_192kbps" },
];

export function ayahAudioUrl(ayahKey: string, reciterId = "alafasy"): string {
  const [s, a] = ayahKey.split(":").map((n) => parseInt(n, 10));
  if (!s || !a) throw new Error(`bad ayah key: ${ayahKey}`);
  const reciter = RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0];
  const ss = String(s).padStart(3, "0");
  const aa = String(a).padStart(3, "0");
  return `https://everyayah.com/data/${reciter.folder}/${ss}${aa}.mp3`;
}
