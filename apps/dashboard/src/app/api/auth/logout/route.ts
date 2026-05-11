import { type NextRequest, NextResponse } from "next/server";

import { COOKIE_NAMES } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/api/auth/login", request.url),
  );
  response.cookies.set(COOKIE_NAMES.session, "", { path: "/", maxAge: 0 });
  return response;
}
