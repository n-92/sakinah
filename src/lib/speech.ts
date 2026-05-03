/**
 * Speech utilities.
 *
 * - `speak(text)` uses the browser SpeechSynthesis API with the best
 *   available natural-sounding voice. Used as a fallback for English when
 *   pre-rendered audio is not available, and for UI confirmations.
 * - `listenOnce({ onResult, onError })` opens the Web Speech API recognition
 *   for a single utterance.
 *
 * Both are progressive enhancements: callers must handle the case where
 * either API is unavailable (older browsers, Firefox).
 */

// Ranked from highest-quality male English voices on each platform downward.
// Microsoft "Online (Natural)" voices are neural and only available in
// Edge / Chromium-on-Windows; macOS uses Daniel/Alex; Android/Chrome falls
// back to Google UK English Male. The heuristic at the end catches any
// remaining male-sounding voice on platforms we haven't enumerated.
const PREFERRED_VOICE_ORDER = [
  "Microsoft Guy Online (Natural) - English (United States)",
  "Microsoft Davis Online (Natural) - English (United States)",
  "Microsoft Andrew Online (Natural) - English (United States)",
  "Microsoft Tony Online (Natural) - English (United States)",
  "Microsoft Brandon Online (Natural) - English (United States)",
  "Microsoft Christopher Online (Natural) - English (United States)",
  "Microsoft Eric Online (Natural) - English (United States)",
  "Microsoft Roger Online (Natural) - English (United States)",
  "Microsoft Ryan Online (Natural) - English (United Kingdom)",
  "Microsoft Thomas Online (Natural) - English (United Kingdom)",
  "Google UK English Male",
  "Daniel",
  "Alex",
  "Fred",
];

const MALE_NAME_RX =
  /\b(male|guy|davis|andrew|tony|brandon|christopher|eric|roger|ryan|thomas|daniel|alex|fred|brian|adam|connor|liam|michael|noah|jacob|aaron|david|mark|james|paul|peter|john)\b/i;

const FEMALE_NAME_RX =
  /\b(female|aria|jenny|sonia|samantha|ava|allison|susan|karen|moira|tessa|veena|fiona|emma|amy|libby|sara|zira|hazel|catherine)\b/i;

let cachedVoices: SpeechSynthesisVoice[] | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length > 0) {
      cachedVoices = existing;
      resolve(existing);
      return;
    }
    const handler = () => {
      cachedVoices = synth.getVoices();
      synth.removeEventListener("voiceschanged", handler);
      resolve(cachedVoices);
    };
    synth.addEventListener("voiceschanged", handler);
    setTimeout(() => {
      if (!cachedVoices) {
        cachedVoices = synth.getVoices();
        resolve(cachedVoices);
      }
    }, 1500);
  });
}

export async function pickVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = cachedVoices ?? (await loadVoices());
  if (!voices.length) return null;
  for (const name of PREFERRED_VOICE_ORDER) {
    const v = voices.find((x) => x.name === name);
    if (v) return v;
  }
  const en = voices.filter((v) => v.lang?.startsWith("en"));
  // Prefer male-named English voices; explicitly skip obviously-female ones.
  const male = en.find(
    (v) => MALE_NAME_RX.test(v.name) && !FEMALE_NAME_RX.test(v.name),
  );
  if (male) return male;
  return (
    en.find((v) => !FEMALE_NAME_RX.test(v.name)) ??
    en[0] ??
    voices[0] ??
    null
  );
}

export async function speak(
  text: string,
  opts: { rate?: number; pitch?: number } = {},
): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = opts.rate ?? 0.9;
  utter.pitch = opts.pitch ?? 0.95;
  const voice = await pickVoice();
  if (voice) utter.voice = voice;
  return new Promise<void>((resolve) => {
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    synth.speak(utter);
  });
}

export function stopSpeaking(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SRWindow = Window & {
  SpeechRecognition?: { new (): SpeechRecognitionLike };
  webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
};

export function isVoiceInputSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as SRWindow;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function listenOnce(opts: {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  lang?: string;
}): { stop: () => void } | null {
  if (typeof window === "undefined") return null;
  const w = window as SRWindow;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) {
    opts.onError?.("Speech recognition is not available in this browser.");
    return null;
  }
  const rec = new Ctor();
  rec.lang = opts.lang ?? "en-US";
  rec.continuous = false;
  rec.interimResults = false;
  rec.onresult = (e) => {
    const transcript = e.results[0]?.[0]?.transcript ?? "";
    if (transcript) opts.onResult(transcript);
  };
  rec.onerror = (e) => opts.onError?.(e.error || "Speech recognition error");
  rec.onend = () => opts.onEnd?.();
  rec.start();
  return { stop: () => rec.stop() };
}
