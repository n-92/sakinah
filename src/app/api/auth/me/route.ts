import { NextResponse } from "next/server";
import { readSession } from "@/lib/qfSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readSession();
  if (!s) return NextResponse.json({ signedIn: false });
  return NextResponse.json({
    signedIn: true,
    sub: s.sub,
    email: s.email,
    name: s.name,
  });
}
