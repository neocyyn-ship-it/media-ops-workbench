import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { SITE_AUTH_COOKIE, isValidSiteAuthToken } from "@/lib/site-auth";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SITE_AUTH_COOKIE)?.value;
  if (await isValidSiteAuthToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const nextPath = pathname === "/" ? "/" : `${pathname}${search}`;
  loginUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/:path*"],
};
