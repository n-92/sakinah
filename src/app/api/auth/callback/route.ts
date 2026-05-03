import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/qfAuth";
import {
  clearPkceCookie,
  readPkceCookie,
  setSessionFromTokens,
} from "@/lib/qfSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");
  const home = new URL("/", url.origin);

  if (errParam) {
    home.searchParams.set("auth_error", errParam);
    return NextResponse.redirect(home);
  }
  if (!code || !state) {
    home.searchParams.set("auth_error", "missing_code_or_state");
    return NextResponse.redirect(home);
  }

  const pkce = await readPkceCookie();
  await clearPkceCookie();
  if (!pkce || pkce.state !== state) {
    home.searchParams.set("auth_error", "state_mismatch");
    return NextResponse.redirect(home);
  }

  try {
    const tokens = await exchangeCode({ code, verifier: pkce.verifier });
    await setSessionFromTokens(tokens);
    home.searchParams.set("signed_in", "1");
    return NextResponse.redirect(home);
  } catch (err) {
    home.searchParams.set(
      "auth_error",
      err instanceof Error ? err.message.slice(0, 80) : "exchange_failed",
    );
    return NextResponse.redirect(home);
  }
}
