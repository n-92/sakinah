import { NextResponse } from "next/server";
import { clearSession } from "@/lib/qfSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  await clearSession();
  return NextResponse.redirect(new URL("/", req.url));
}
