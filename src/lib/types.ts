// Shared types used across server and client.

export type Translation = {
  edition_id: string;
  edition_name: string;
  language: string;
  text: string;
};

export type Ayah = {
  ayah_key: string; // "2:255"
  surah: number;
  ayah: number;
  arabic: string;
  translations: Translation[];
  url?: string;
  relevance?: number;
};

export type Passage = {
  surah: number;
  start: number;
  end: number;
  reason?: string; // why we picked this passage (e.g. matched ayah text)
};

export type DuaMeta = {
  id: string;
  category: string;
  title: string;
  context: string;
  hadith?: string;
  reciter?: string;
  matchedOn?: string[];
};

export type SearchResponse = {
  query: string;
  ayahs: Ayah[];
  passages?: Passage[];
  total: number;
  warnings?: string[];
  duas?: DuaMeta[];
  source?: "semantic" | "dua" | "random" | "ayah_of_the_day" | "surah" | "plan";
  /** Optional one-line notice surfaced to the user (e.g. capped surah). */
  notice?: string;
  /** Human-readable record of MCP tool calls used to ground this response. */
  citations?: string[];
};
