import { NextResponse } from "next/server";
import { getCurrentStreak, getActivityDays, QfApiError } from "@/lib/qfUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tz = url.searchParams.get("tz") || undefined;

  try {
    const days = await getCurrentStreak(tz);
    const to = new Date();
    const from = new Date(to.getTime() - 365 * 86_400_000);
    let total = 0;
    try {
      const activity = await getActivityDays({
        from: isoDay(from),
        to: isoDay(to),
        timezone: tz,
      });
      total = activity.length;
    } catch {
      total = days; // graceful fallback
    }
    return NextResponse.json({ ok: true, current_streak: days, total_sessions: total });
  } catch (err) {
    if (err instanceof QfApiError && err.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    const debug =
      err instanceof QfApiError
        ? { status: err.status, body: err.body, message: err.message }
        : { message: err instanceof Error ? err.message : String(err) };
    console.error("[/api/user/streak] upstream error", debug);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unknown", debug },
      { status: 502 },
    );
  }
}
