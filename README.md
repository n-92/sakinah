# Sakīnah — Find Peace in the Qur'an

> *"It is He who sent down **sakīnah** (tranquillity) into the hearts of the believers."* — Qur'an 48:4

**Sakīnah** is an accessibility-first, voice-driven Qur'an companion built for the
[Quran Foundation Hackathon 2026](https://launch.provisioncapital.com/quran-hackathon).
You tell it how your heart feels — out loud or by typing — and it plays a
shuffled playlist of Qur'anic ayahs that may speak to that feeling, with
soothing Arabic recitation followed by a natural English voice.

The whole flow is designed so a blind or low-vision user can use it with their
eyes closed and a single key.

## What's special

- **Voice in, voice out.** Web Speech API for input, EveryAyah CDN for
  Arabic recitation, browser-native neural voices (Aria / Jenny / Sonia) for
  English translation. No paid TTS dependencies — runs at $0/request.
- **Real semantic search** through the official
  [Quran MCP](https://mcp.quran.ai) — `search_quran` runs vector search +
  reranking on every ayah, in any language. Your mood phrase *is* the query.
- **Full keyboard / screen-reader UX.** ARIA live regions, single-key
  controls (Space ⇒ play/pause, ←/→ ⇒ prev/next, R ⇒ replay, B ⇒ bookmark,
  Esc ⇒ home), `prefers-reduced-motion` honoured, AAA contrast palette.
- **User-data layer** modelled on the Quran Foundation User APIs — bookmarks,
  mood-collections, daily streaks. Demo uses `localStorage`; swap to OAuth2
  in production.

## Hackathon API requirement coverage

| Requirement | How Sakīnah meets it |
| --- | --- |
| Content API integration | `src/lib/mcp.ts` connects server-side to `https://mcp.quran.ai` (Streamable HTTP), uses `fetch_grounding_rules`, `search_quran`, `fetch_tafsir`. |
| User API integration | `src/lib/storage.ts` — bookmarks / mood collections / streak tracking with the same resource shape as the QF User API. |
| Audio | `everyayah.com` Arabic recitations + browser SpeechSynthesis for English. |

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- `@modelcontextprotocol/sdk` (Node) — server-side MCP client only
- Web Speech API (input) + `HTMLAudioElement` queue (output)

## Running locally

```sh
git clone https://github.com/n-92/sakinah.git
cd sakinah
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to get it |
| --- | --- |
| `QF_CLIENT_ID`, `QF_CLIENT_SECRET` | Register an OAuth2 app at <https://api-docs.quran.foundation>. |
| `QF_ENV`, `QF_AUTH_BASE`, `QF_API_BASE` | Use the `prelive` values from `.env.example` while developing. |
| `QF_REDIRECT_URI` | `http://localhost:3000/api/auth/callback` for local dev. |
| `SESSION_SECRET` | Generate one: `openssl rand -hex 32`. |
| `QURAN_MCP_URL` | Defaults to `https://mcp.quran.ai/` (no auth required). |

The dev server makes outbound calls to:
- `https://mcp.quran.ai` (semantic ayah search, no auth required)
- `https://everyayah.com/data/...` (Arabic MP3s)
- `https://prelive-oauth2.quran.foundation` and `https://apis-prelive.quran.foundation` (QF OAuth + User APIs)

## Project layout

```
src/
├─ app/
│  ├─ page.tsx            ← composition: MoodInput → /api/search → AyahPlayer
│  ├─ layout.tsx          ← skip-link, dark a11y theme
│  ├─ globals.css         ← AAA contrast, focus rings, reduced-motion
│  └─ api/search/route.ts ← POST {mood} → MCP search_quran → Ayah[]
├─ components/
│  ├─ MoodInput.tsx       ← big mic button + text fallback, ARIA live
│  ├─ AyahPlayer.tsx      ← Arabic MP3 → English speak() → next loop
│  └─ UserPanel.tsx       ← streak, bookmarks, saved mood-collections
└─ lib/
   ├─ mcp.ts              ← MCP client singleton + grounding nonce cache
   ├─ audio.ts            ← reciter URL builder
   ├─ speech.ts           ← speak() / listenOnce() / smart voice picker
   ├─ storage.ts          ← User-API-shaped localStorage layer
   └─ types.ts
```

## Keyboard shortcuts (in player)

| Key | Action |
| --- | --- |
| Space | Play / pause |
| ← | Previous ayah |
| → | Next ayah |
| R | Replay current |
| B | Bookmark current |
| Esc | Back to home |

## Judging-criteria mapping

- **Impact (30)** — Voice-first design opens the Qur'an to blind / low-vision
  users and to anyone who can't read Arabic. Emotional matching meets people
  where they are.
- **UX (20)** — Single-key, screen-reader-first; AAA contrast; reduced-motion
  honoured; large focus rings; audio confirmations of every state change.
- **Tech (20)** — Real Streamable-HTTP MCP client with grounding-nonce
  caching; SpeechSynthesis voice ranking; deterministic audio queue.
- **Innovation (15)** — MCP-grounded mood-to-ayah is novel; treats the user's
  free-form feeling as a vector query against canonical scripture.
- **API depth (15)** — Content (MCP) + Audio (Quran.com CDN) + User
  resources (Bookmarks, Collections, Streaks).

## License

MIT for code. Qur'anic text and recitations belong to their respective sources.
