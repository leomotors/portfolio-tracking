import { type NextRequest, NextResponse } from "next/server";

import {
  COOKIE_NAMES,
  getRequestOrigin,
  parseAllowedUserIds,
  sanitizeReturnTo,
  SESSION_TTL_SECONDS,
  signSession,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const authSecret = process.env.AUTH_SECRET;
  const allowed = parseAllowedUserIds(process.env.ALLOWED_USER_IDS);

  if (!allowed) {
    return new NextResponse("Service unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
  if (!clientId || !clientSecret || !redirectUri || !authSecret) {
    return new NextResponse("Auth misconfigured", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(COOKIE_NAMES.state)?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return new NextResponse("Invalid OAuth state", {
      status: 400,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!tokenRes.ok) {
    return new NextResponse("Discord token exchange failed", {
      status: 502,
      headers: { "Content-Type": "text/plain" },
    });
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    return new NextResponse("Discord token exchange returned no token", {
      status: 502,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userRes.ok) {
    return new NextResponse("Discord user lookup failed", {
      status: 502,
      headers: { "Content-Type": "text/plain" },
    });
  }
  const user = (await userRes.json()) as {
    id?: string;
    username?: string;
    global_name?: string | null;
    avatar?: string | null;
  };
  if (!user.id) {
    return new NextResponse("Discord user lookup returned no id", {
      status: 502,
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (!allowed.includes(user.id)) {
    return new NextResponse(
      "Forbidden: this Discord account is not authorized to access this site.",
      { status: 403, headers: { "Content-Type": "text/plain" } },
    );
  }

  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const name = user.global_name ?? user.username ?? user.id;
  const sessionToken = await signSession(
    { uid: user.id, exp, name, avatar: user.avatar ?? null },
    authSecret,
  );

  const returnTo = sanitizeReturnTo(
    request.cookies.get(COOKIE_NAMES.returnTo)?.value,
  );
  const response = NextResponse.redirect(
    new URL(returnTo, getRequestOrigin(request)),
  );
  const isSecure = request.nextUrl.protocol === "https:";
  response.cookies.set(COOKIE_NAMES.session, sessionToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  response.cookies.set(COOKIE_NAMES.state, "", {
    path: "/api/auth",
    maxAge: 0,
  });
  response.cookies.set(COOKIE_NAMES.returnTo, "", {
    path: "/api/auth",
    maxAge: 0,
  });
  return response;
}
