import Link from "next/link";

export const metadata = {
  title: "Documentation · Sakīnah",
  description:
    "How Sakīnah works — the accessibility-first Qur'ān companion built for the Quran Foundation Hackathon 2026.",
};

export default function DocsPage() {
  return (
    <main
      id="main"
      className="flex-1 flex justify-center px-4 py-10 sm:py-16"
    >
      <article className="w-full max-w-3xl space-y-12 text-slate-200">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300/80">
            Documentation
          </p>
          <h1 className="text-4xl sm:text-5xl font-serif text-amber-200 tracking-wide">
            How Sakīnah works
          </h1>
          <p className="text-slate-400 leading-relaxed">
            Sakīnah is an accessibility-first Qur&apos;ān companion. Tell it what&apos;s on
            your mind in plain words — it finds a fitting passage, recites it, and
            explains it. Designed for people who can&apos;t read a screen, can&apos;t use a
            mouse, or simply want a calmer way to engage with the Qur&apos;ān.
          </p>
          <p className="pt-2">
            <Link
              href="/"
              className="text-sm text-amber-300 hover:text-amber-200 underline underline-offset-4"
            >
              ← Back to app
            </Link>
          </p>
        </header>

        <Section title="The 30-second tour">
          <ol className="list-decimal pl-5 space-y-3 leading-relaxed">
            <li>
              <strong className="text-slate-100">Type or speak</strong>{" "}
              what you&apos;re
              thinking — &ldquo;I feel anxious&rdquo;, &ldquo;studying for an exam&rdquo;, &ldquo;tell
              me about animals&rdquo;.
            </li>
            <li>
              <strong className="text-slate-100">Sakīnah listens.</strong>{" "}
              It first
              checks a curated catalogue of authentic du&apos;ās from the Qur&apos;ān; if
              nothing fits, it does a semantic search across the Qur&apos;ān via the
              Qur&apos;ān Foundation MCP server.
            </li>
            <li>
              <strong className="text-slate-100">It plays the passage.</strong>{" "}
              Arabic
              recitation, then English translation, ayah by ayah. Tafsīr Ibn Kathīr is
              one tap away.
            </li>
          </ol>
        </Section>

        <Section title="Features">
          <FeatureGrid />
        </Section>

        <Section title="Keyboard shortcuts">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-800">
                <KbdRow keys="Space" desc="Play / pause" />
                <KbdRow keys="← / →" desc="Previous / next ayah" />
                <KbdRow keys="R" desc="Repeat current ayah" />
                <KbdRow keys="B" desc="Bookmark / unbookmark" />
                <KbdRow keys="T" desc="Show / hide tafsīr" />
                <KbdRow keys="Esc" desc="Close player" />
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Accessibility">
          <p className="leading-relaxed">
            Sakīnah is built to WCAG 2.1 AA standards and tested with{" "}
            <em>eyes-closed mode</em> — every flow can be completed without seeing the
            screen.
          </p>
          <ul className="list-disc pl-5 mt-3 space-y-3 leading-relaxed">
            <li>Full keyboard navigation; visible focus rings on every control</li>
            <li>
              Screen-reader announcements via <code className="kbd">aria-live</code>{" "}
              regions for play state and search results
            </li>
            <li>Voice input (Web Speech API) for users who can&apos;t type</li>
            <li>
              Text-to-speech narration with a <em>male reciter</em> by default; falls
              back gracefully when the browser can&apos;t reach Google&apos;s speech servers
            </li>
            <li>High-contrast palette (slate + amber), minimum 16 px body text</li>
            <li>
              Respects <code className="kbd">prefers-reduced-motion</code> for the
              ambient hero glow
            </li>
          </ul>
        </Section>

        <Section title="Grounding & citations">
          <p className="leading-relaxed">
            Sakīnah never paraphrases the Qur&apos;ān from memory. Every ayah, translation,
            and tafsīr you see comes directly from a tool call to the Qur&apos;ān Foundation
            content server, and the exact tool calls are printed under each result:
          </p>
          <pre className="mt-4 rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs text-slate-300 font-mono overflow-x-auto">
{`✓ Grounded in mcp.quran.ai:
  search_quran("anxious heart", translations=en-sahih-international) ·
  fetch_quran(13:28-30, ar-simple-clean) ·
  fetch_translation(13:28-30, en-sahih-international) ·
  fetch_tafsir(13:28, en-ibn-kathir)`}
          </pre>
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">
            If you don&apos;t see a citation line, the answer wasn&apos;t grounded — but Sakīnah
            always shows one.
          </p>
        </Section>

        <Section title="Quran Foundation APIs we use">
          <ul className="space-y-3">
            <ApiRow
              name="MCP Content Server (mcp.quran.ai)"
              tools="search_quran · fetch_quran · fetch_translation · fetch_tafsir"
              what="Semantic search and canonical Arabic / English / tafsīr text"
            />
            <ApiRow
              name="OAuth2 (authorization_code + PKCE)"
              tools="prelive-oauth2.quran.foundation"
              what="Sign-in so user data (streaks, bookmarks, reflections) is portable across devices"
            />
            <ApiRow
              name="Activity Days API"
              tools="POST /auth/v1/activity-days"
              what="Records each reading session so streaks count toward the user's overall Qur'ān engagement, not just our app"
            />
            <ApiRow
              name="Streaks API"
              tools="GET /auth/v1/streaks/current-streak-days"
              what="Reads the user's current streak from the source of truth"
            />
          </ul>
        </Section>

        <Section title="Privacy">
          <ul className="list-disc pl-5 space-y-3 leading-relaxed">
            <li>
              <strong className="text-slate-100">Guests:</strong>{" "}
              bookmarks and saved
              moods stay in your browser&apos;s <code className="kbd">localStorage</code>.
              Nothing leaves your device.
            </li>
            <li>
              <strong className="text-slate-100">Signed-in users:</strong>{" "}
              reading
              sessions are POSTed to the Qur&apos;ān Foundation Activity Days API so streaks
              follow you anywhere. Your search queries are never stored.
            </li>
            <li>
              <strong className="text-slate-100">No third-party analytics.</strong>{" "}
              No
              trackers, no ads, no fingerprinting.
            </li>
            <li>
              <strong className="text-slate-100">Voice input</strong>{" "}
              uses your
              browser&apos;s built-in Web Speech API — audio is processed by your browser
              vendor (typically Google), never by Sakīnah.
            </li>
          </ul>
        </Section>

        <Section title="Tech stack">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <Tech label="Framework" value="Next.js 15 (App Router)" />
            <Tech label="Language" value="TypeScript (strict)" />
            <Tech label="Styling" value="Tailwind CSS 4" />
            <Tech label="MCP client" value="@modelcontextprotocol/sdk" />
            <Tech label="Audio" value="Quran.com CDN (verse-by-verse)" />
            <Tech label="TTS" value="Web Speech Synthesis API" />
            <Tech label="Voice input" value="Web Speech Recognition API" />
            <Tech label="Hosting" value="Vercel" />
          </ul>
        </Section>

        <Section title="A note on scholarly authority">
          <p className="leading-relaxed text-slate-300">
            Sakīnah is a <em>study tool</em>, not a mufti. It surfaces canonical Qur&apos;ān
            text, verified translations, and classical tafsīr. It deliberately does
            <strong> not</strong> issue fatwās, give personal rulings, or speculate
            beyond its sources. For matters of fiqh, please consult a qualified scholar.
          </p>
        </Section>

        <footer className="border-t border-slate-800 pt-6 text-xs text-slate-500 leading-relaxed">
          Built for the Quran Foundation Hackathon 2026.{" "}
          <Link href="/" className="underline hover:text-slate-300">
            Open the app →
          </Link>
        </footer>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-serif text-amber-200">{title}</h2>
      <div className="text-slate-300">{children}</div>
    </section>
  );
}

function FeatureGrid() {
  const features: { title: string; body: string }[] = [
    {
      title: "Mood-first search",
      body: "Describe how you feel or what you're thinking — no need to know surah numbers or Arabic.",
    },
    {
      title: "Curated du'ā catalogue",
      body: "Authentic Qur'ānic du'ās matched to common intents (anxiety, gratitude, knowledge, forgiveness…) before falling back to broad search.",
    },
    {
      title: "Consecutive passages",
      body: "Plays surahs in their natural order — never jumps between unrelated verses.",
    },
    {
      title: "Tafsīr Ibn Kathīr",
      body: "One click reveals the classical commentary for the ayah you're on. Lazy-loaded, cached, scrollable.",
    },
    {
      title: "Voice & keyboard control",
      body: "Speak your mood; control playback with the keyboard alone.",
    },
    {
      title: "Surprise me",
      body: "Random shuffle: a complete short surah, picked for you.",
    },
    {
      title: "Streaks that follow you",
      body: "Sign in to record reading sessions to the Qur'ān Foundation Activity Days API — your streak is yours, not ours.",
    },
    {
      title: "Bookmarks & saved moods",
      body: "Save passages you want to come back to. Saved moods replay the same query later.",
    },
  ];
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {features.map((f) => (
        <li
          key={f.title}
          className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
        >
          <h3 className="text-amber-300 font-medium mb-1">{f.title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
        </li>
      ))}
    </ul>
  );
}

function KbdRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <tr>
      <td className="py-2.5 px-4 w-32">
        <kbd className="kbd">{keys}</kbd>
      </td>
      <td className="py-2.5 px-4 text-slate-300">{desc}</td>
    </tr>
  );
}

function ApiRow({
  name,
  tools,
  what,
}: {
  name: string;
  tools: string;
  what: string;
}) {
  return (
    <li className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <p className="font-medium text-slate-100">{name}</p>
      <p className="text-xs font-mono text-emerald-300/80 mt-1 break-words">
        {tools}
      </p>
      <p className="text-sm text-slate-400 mt-2 leading-relaxed">{what}</p>
    </li>
  );
}

function Tech({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
      <span className="text-xs uppercase tracking-wider text-slate-500 w-20 shrink-0">
        {label}
      </span>
      <span className="text-slate-200">{value}</span>
    </li>
  );
}
