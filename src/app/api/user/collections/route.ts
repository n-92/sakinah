import { NextResponse } from "next/server";
import {
  createCollection,
  addBookmarkToCollection,
  addStandaloneBookmark,
  QfApiError,
} from "@/lib/qfUser";

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      ayahs?: Array<{ surah: number; ayah: number }>;
    };
    if (!body.name) {
      return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
    }
    const collection = await createCollection(body.name);

    const added: string[] = [];
    if (body.ayahs && body.ayahs.length > 0) {
      for (const a of body.ayahs) {
        try {
          const bm = await addStandaloneBookmark({ surah: a.surah, ayah: a.ayah });
          await addBookmarkToCollection(collection.id, bm.id);
          added.push(bm.id);
        } catch {
          // continue best-effort
        }
      }
    }
    return NextResponse.json({ ok: true, collection, added });
  } catch (e) {
    return err(e);
  }
}
