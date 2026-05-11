import { type NextRequest, NextResponse } from "next/server";

import {
  COOKIE_NAMES,
  randomState,
  sanitizeReturnTo,
  STATE_TTL_SECONDS,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return new NextResponse(
      "Auth misconfigured: DISCORD_CLIENT_ID or DISCORD_REDIRECT_URI is not set",
      { status: 500, headers: { "Content-Type": "text/plain" } },
    );
  }

  const state = randomState();
  const returnTo = sanitizeReturnTo(
    request.nextUrl.searchParams.get("returnTo"),
  );

  const authorizeUrl = new URL("https://discord.com/oauth2/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "identify");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  const isSecure = request.nextUrl.protocol === "https:";
  const baseOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: STATE_TTL_SECONDS,
  };
  response.cookies.set(COOKIE_NAMES.state, state, baseOptions);
  response.cookies.set(COOKIE_NAMES.returnTo, returnTo, baseOptions);
  return response;
}
