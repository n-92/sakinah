import { NextResponse } from "next/server";
import { addNote, getNotesByVerse, listAllNotes, deleteNote, QfApiError } from "@/lib/qfUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function err(e: unknown) {
  if (e instanceof QfApiError && e.status === 401) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json(
    { ok: false, error: e instanceof Error ? e.message : "unknown" },
    { status: 502 },
  );
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const verseKey = url.searchParams.get("verseKey");
    if (verseKey) {
      if (!/^\d+:\d+$/.test(verseKey)) {
        return NextResponse.json(
          { ok: false, error: "verseKey must look like 2:255" },
          { status: 400 },
        );
      }
      const notes = await getNotesByVerse(verseKey);
      return NextResponse.json({ ok: true, notes });
    }
    // No verseKey → list all notes for the user.
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Math.max(1, Math.min(50, Number(limitRaw))) : 50;
    const sortBy = url.searchParams.get("sortBy") === "oldest" ? "oldest" : "newest";
    const r = await listAllNotes({ cursor, limit, sortBy });
    return NextResponse.json({ ok: true, notes: r.notes, nextCursor: r.nextCursor });
  } catch (e) {
    return err(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { body?: string; verseKey?: string };
    if (!body.body || body.body.trim().length < 6) {
      return NextResponse.json(
        { ok: false, error: "body must be at least 6 characters" },
        { status: 400 },
      );
    }
    if (!body.verseKey || !/^\d+:\d+$/.test(body.verseKey)) {
      return NextResponse.json(
        { ok: false, error: "verseKey required (e.g. 2:255)" },
        { status: 400 },
      );
    }
    // Note ranges expect "s:a-s:a"; convert single key to a 1-ayah range.
    const range = `${body.verseKey}-${body.verseKey}`;
    const note = await addNote(body.body.trim(), [range]);
    return NextResponse.json({ ok: true, note });
  } catch (e) {
    return err(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    }
    await deleteNote(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return err(e);
  }
}
