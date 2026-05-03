/**
 * Server-side MCP client for the Quran MCP at https://mcp.quran.ai
 *
 * Strategy:
 *  - Maintain a singleton MCP `Client` connected via the Streamable HTTP transport.
 *  - On first use, call `fetch_grounding_rules` once and cache the returned
 *    `grounding_nonce`, then pass it to subsequent canonical-data tool calls
 *    (per the server's instruction string) to suppress redundant grounding text.
 *  - Defensive parsing: the MCP SDK returns `content` as an array of typed parts
 *    plus `structuredContent`; we prefer the structured form when present and
 *    fall back to JSON-parsing the first text part.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = process.env.QURAN_MCP_URL ?? "https://mcp.quran.ai/";

type ToolResult = {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
};

let clientPromise: Promise<Client> | null = null;
let groundingNonce: string | null = null;

async function getClient(): Promise<Client> {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
    const client = new Client(
      { name: "sakinah", version: "0.1.0" },
      { capabilities: {} },
    );
    await client.connect(transport);
    return client;
  })().catch((err) => {
    clientPromise = null;
    throw err;
  });
  return clientPromise;
}

function extractStructured(res: ToolResult): unknown {
  if (res.structuredContent !== undefined && res.structuredContent !== null) {
    return res.structuredContent;
  }
  const text = res.content?.find((c) => c.type === "text")?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

async function ensureNonce(client: Client): Promise<string | null> {
  if (groundingNonce) return groundingNonce;
  try {
    const res = (await client.callTool({
      name: "fetch_grounding_rules",
      arguments: {},
    })) as ToolResult;
    const data = extractStructured(res) as { grounding_nonce?: string } | null;
    if (data?.grounding_nonce) {
      groundingNonce = data.grounding_nonce;
    }
  } catch {
    // Non-fatal; subsequent tool calls will simply receive grounding rules inline.
  }
  return groundingNonce;
}

export async function searchQuran(opts: {
  query: string;
  translations?: string | string[];
  surah?: number;
}): Promise<unknown> {
  const client = await getClient();
  const nonce = await ensureNonce(client);
  const args: Record<string, unknown> = {
    query: opts.query,
    translations: opts.translations ?? "auto",
  };
  if (opts.surah) args.surah = opts.surah;
  if (nonce) args.grounding_nonce = nonce;

  const res = (await client.callTool({
    name: "search_quran",
    arguments: args,
  })) as ToolResult;
  if (res.isError) {
    const msg = res.content?.find((c) => c.type === "text")?.text ?? "Unknown MCP error";
    throw new Error(`search_quran failed: ${msg}`);
  }
  return extractStructured(res);
}

export async function fetchQuran(opts: {
  ayahs: string;
  editions?: string | string[];
}): Promise<unknown> {
  const client = await getClient();
  const nonce = await ensureNonce(client);
  const args: Record<string, unknown> = {
    ayahs: opts.ayahs,
    editions: opts.editions ?? "ar-simple-clean",
  };
  if (nonce) args.grounding_nonce = nonce;
  const res = (await client.callTool({
    name: "fetch_quran",
    arguments: args,
  })) as ToolResult;
  if (res.isError) {
    const msg = res.content?.find((c) => c.type === "text")?.text ?? "Unknown MCP error";
    throw new Error(`fetch_quran failed: ${msg}`);
  }
  return extractStructured(res);
}

export async function fetchTranslation(opts: {
  ayahs: string;
  editions?: string | string[];
}): Promise<unknown> {
  const client = await getClient();
  const nonce = await ensureNonce(client);
  const args: Record<string, unknown> = {
    ayahs: opts.ayahs,
    editions: opts.editions ?? "en-sahih-international",
  };
  if (nonce) args.grounding_nonce = nonce;
  const res = (await client.callTool({
    name: "fetch_translation",
    arguments: args,
  })) as ToolResult;
  if (res.isError) {
    const msg = res.content?.find((c) => c.type === "text")?.text ?? "Unknown MCP error";
    throw new Error(`fetch_translation failed: ${msg}`);
  }
  return extractStructured(res);
}

export async function fetchTafsir(opts: {
  ayahs: string;
  editions?: string | string[];
}): Promise<unknown> {
  const client = await getClient();
  const nonce = await ensureNonce(client);
  const args: Record<string, unknown> = {
    ayahs: opts.ayahs,
    editions: opts.editions ?? "en-ibn-kathir",
  };
  if (nonce) args.grounding_nonce = nonce;

  const res = (await client.callTool({
    name: "fetch_tafsir",
    arguments: args,
  })) as ToolResult;
  if (res.isError) {
    const msg = res.content?.find((c) => c.type === "text")?.text ?? "Unknown MCP error";
    throw new Error(`fetch_tafsir failed: ${msg}`);
  }
  return extractStructured(res);
}
