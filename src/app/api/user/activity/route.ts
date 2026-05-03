import { NextResponse } from "next/server";
import { postActivityDay, QfApiError } from "@/lib/qfUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  seconds?: number;
  ranges?: string;
  mushafId?: number;
  date?: string;
  timezone?: string;
};

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body */
  }
  const seconds = Math.max(1, Math.floor(body.seconds ?? 30));
  const ranges = body.ranges?.trim() || "1:1-1:1";
  const mushafId = body.mushafId ?? 4; // UthmaniHafs default

  try {
    const r = await postActivityDay(
      { type: "QURAN", seconds, ranges, mushafId, date: body.date },
      body.timezone,
    );
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    if (err instanceof QfApiError && err.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }
}
