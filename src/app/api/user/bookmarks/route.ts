import { NextResponse } from "next/server";
import {
  addBookmark,
  listBookmarks,
  deleteBookmark,
  QfApiError,
} from "@/lib/qfUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function err(e: unknown) {
  if (e instanceof QfApiError && e.status === 401) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  if (e instanceof QfApiError) {
    console.error("QF Bookmark error", { status: e.status, body: e.body });
    return NextResponse.json(
      {
        ok: false,
        error: e.message,
        debug: { status: e.status, body: e.body },
      },
      { status: 502 },
    );
  }
  return NextResponse.json(
    { ok: false, error: e instanceof Error ? e.message : "unknown" },
    { status: 502 },
  );
}

export async function GET() {
  try {
    const data = await listBookmarks(4);
    return NextResponse.json({ ok: true, bookmarks: data });
  } catch (e) {
    return err(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { surah?: number; ayah?: number };
    if (!body.surah || !body.ayah) {
      return NextResponse.json({ ok: false, error: "surah and ayah required" }, { status: 400 });
    }
    await addBookmark({ surah: body.surah, ayah: body.ayah });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");
    const key = url.searchParams.get("key");
    if (!id && key) {
      // Resolve QF bookmark id from "surah:ayah".
      const m = key.match(/^(\d+):(\d+)$/);
      if (!m) {
        return NextResponse.json({ ok: false, error: "key must be s:a" }, { status: 400 });
      }
      const surah = Number(m[1]);
      const ayah = Number(m[2]);
      const list = await listBookmarks();
      const match = list.find(
        (b) => b.type === "ayah" && b.key === surah && b.verseNumber === ayah,
      );
      if (!match) {
        // Already absent on the server — treat as success so the client UI converges.
        return NextResponse.json({ ok: true, removed: false });
      }
      id = match.id;
    }
    if (!id) {
      return NextResponse.json({ ok: false, error: "id or key required" }, { status: 400 });
    }
    await deleteBookmark(id);
    return NextResponse.json({ ok: true, removed: true });
  } catch (e) {
    return err(e);
  }
}
