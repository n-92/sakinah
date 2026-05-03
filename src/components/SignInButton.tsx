"use client";

import { useEffect, useState } from "react";

type Me =
  | { signedIn: false }
  | { signedIn: true; sub: string; email?: string; name?: string };

export default function SignInButton({
  onChange,
}: {
  onChange?: (signedIn: boolean) => void;
}) {
  const [me, setMe] = useState<Me | null>(null);

  async function refresh() {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await r.json()) as Me;
      setMe(data);
      onChange?.(data.signedIn);
    } catch {
      setMe({ signedIn: false });
      onChange?.(false);
    }
  }

  useEffect(() => {
    refresh();
    if (typeof window !== "undefined") {
      const u = new URL(window.location.href);
      if (u.searchParams.has("signed_in") || u.searchParams.has("auth_error")) {
        u.searchParams.delete("signed_in");
        u.searchParams.delete("auth_error");
        window.history.replaceState({}, "", u.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    refresh();
  }

  if (me === null) {
    return <div aria-hidden="true" className="h-9 w-24 rounded-full bg-slate-800/40" />;
  }

  if (!me.signedIn) {
    return (
      <a
        href="/api/auth/login"
        className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
      >
        Sign in with Quran.Foundation
      </a>
    );
  }

  const label = me.name ?? me.email ?? "Signed in";
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className="px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-900 text-emerald-200"
        title={`Quran Foundation user · ${me.sub}`}
      >
        ✓ {label}
      </span>
      <button
        type="button"
        onClick={logout}
        className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        Sign out
      </button>
    </div>
  );
}
