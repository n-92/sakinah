/**
 * Score and rank du'ā catalog entries against a free-form user request.
 *
 * Approach: cheap, deterministic keyword scoring. Each entry's `intents[]`,
 * `title`, and `context` are tokenized and matched against the user's tokens.
 * Hits on `intents` are weighted highest; title/context provide soft signal.
 */

import { DUAS, type DuaEntry } from "@/lib/duas";

const STOPWORDS = new Set([
  "a","an","the","i","im","i'm","is","am","are","was","were","be","been","being",
  "to","of","in","on","at","for","with","and","or","but","not","no",
  "my","me","mine","you","your","we","us","our","they","them","their","it","its",
  "this","that","these","those","please","help","like","just","really","very",
  "feel","feeling","feels","felt","want","need","needed","wanted","trying","try",
  "make","making","made","do","does","did","doing","done","get","got","gets",
  "have","has","had","having","go","going","gone","went","can","cant","cannot",
  "should","would","could","may","might","will","wont","s","t","re","ve","ll","d","m",
  "about","around","regarding","concerning",
  "from","by","into","onto","over","under","off","than","then","also","more","most",
  "some","any","all","every","each","thing","things","stuff","topic","subject",
]);

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")           // strip diacritics
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^'+|'+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function hasPhrase(haystack: string, needle: string): boolean {
  return haystack.includes(needle);
}

export type DuaMatch = { entry: DuaEntry; score: number; matchedOn: string[] };

/** Score a single entry against pre-tokenized user input. */
function scoreEntry(
  entry: DuaEntry,
  userText: string,
  userTokens: Set<string>,
): DuaMatch {
  let score = 0;
  const matched: string[] = [];

  // Strongest signal: full or partial phrase match against intents.
  for (const intent of entry.intents) {
    const intentLower = intent.toLowerCase();
    if (hasPhrase(userText, intentLower)) {
      score += 5; // phrase match is gold
      matched.push(intent);
      continue;
    }
    // Partial: count overlapping content tokens with this intent.
    const intentTokens = tokenize(intent);
    if (intentTokens.length === 0) continue;
    let overlap = 0;
    for (const t of intentTokens) {
      if (userTokens.has(t)) overlap++;
    }
    if (overlap > 0) {
      // Normalize by intent length so a 1-word intent ("anxiety") that fully
      // matches scores ~ a 4-word intent that fully matches.
      score += (overlap / intentTokens.length) * 3;
      if (overlap === intentTokens.length) matched.push(intent);
    }
  }

  // Soft signal: title / context tokens.
  const meta = `${entry.title} ${entry.context}`.toLowerCase();
  const metaTokens = new Set(tokenize(meta));
  let metaOverlap = 0;
  for (const t of userTokens) {
    if (metaTokens.has(t)) metaOverlap++;
  }
  score += metaOverlap * 0.4;

  return { entry, score, matchedOn: matched };
}

/**
 * Returns top-N du'ā matches for a free-form user request.
 * Filters out matches with score below MIN_SCORE — the caller should fall
 * back to semantic search if no matches are confident enough.
 */
export function matchDuas(
  request: string,
  opts: { topN?: number; minScore?: number } = {},
): DuaMatch[] {
  const topN = opts.topN ?? 3;
  const minScore = opts.minScore ?? 1.5;
  const lower = request.toLowerCase();
  const tokens = new Set(tokenize(request));

  if (tokens.size === 0) return [];

  const scored = DUAS.map((e) => scoreEntry(e, lower, tokens))
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return scored;
}

/** Browse helper — entries grouped by category. */
export function duasByCategory(): Map<string, DuaEntry[]> {
  const m = new Map<string, DuaEntry[]>();
  for (const d of DUAS) {
    if (!m.has(d.category)) m.set(d.category, []);
    m.get(d.category)!.push(d);
  }
  return m;
}
