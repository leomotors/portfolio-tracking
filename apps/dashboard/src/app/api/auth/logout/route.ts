import { type NextRequest, NextResponse } from "next/server";

import { COOKIE_NAMES, getRequestOrigin } from "@/lib/auth";

// Logout clears the session, so it must not be reachable as a cross-site GET:
// `<img src=".../api/auth/logout">` on any page the signed-in user visits would
// otherwise end their session. The route is POST-only and additionally checks
// that the request came from this app.
function isSameOrigin(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";

  // Older clients send no Sec-Fetch-Site; fall back to Origin.
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === getRequestOrigin(request);
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const response = NextResponse.redirect(
    new URL("/api/auth/login", request.url),
    // 303 so the browser follows the redirect with GET rather than re-POSTing.
    303,
  );
  response.cookies.set(COOKIE_NAMES.session, "", { path: "/", maxAge: 0 });
  return response;
}
