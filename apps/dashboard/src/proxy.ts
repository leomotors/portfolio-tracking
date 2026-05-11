import { type NextRequest, NextResponse } from "next/server";

import { COOKIE_NAMES, parseAllowedUserIds, verifySession } from "@/lib/auth";

const PUBLIC_PATH_PREFIXES = ["/api/auth/"];
const PUBLIC_PATHS = new Set(["/login"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const allowed = parseAllowedUserIds(process.env.ALLOWED_USER_IDS);
  if (!allowed) {
    return new NextResponse("Service unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }

  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return new NextResponse("Auth misconfigured: AUTH_SECRET is not set", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const token = request.cookies.get(COOKIE_NAMES.session)?.value;
  const session = await verifySession(token, secret);
  if (!session || !allowed.includes(session.uid)) {
    const loginUrl = new URL("/login", request.url);
    const returnTo = request.nextUrl.pathname + request.nextUrl.search;
    if (returnTo && returnTo !== "/") {
      loginUrl.searchParams.set("returnTo", returnTo);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
