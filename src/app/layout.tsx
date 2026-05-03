import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sakīnah — Qur'an for the heart",
  description:
    "Tell us what's on your mind — Sakīnah will speak the Qur'an to you. An accessibility-first Qur'an companion built on the Quran MCP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-amber-300 focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-md"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
