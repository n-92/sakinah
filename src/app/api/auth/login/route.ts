import { NextResponse } from "next/server";
import { buildAuthorizeUrl, generatePkce, generateState } from "@/lib/qfAuth";
import { setPkceCookie } from "@/lib/qfSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { verifier, challenge } = generatePkce();
  const state = generateState();
  await setPkceCookie(verifier, state);
  const url = buildAuthorizeUrl({ state, challenge });
  return NextResponse.redirect(url);
}
